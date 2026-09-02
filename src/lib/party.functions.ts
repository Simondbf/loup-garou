import { createServerFn } from "@tanstack/react-start";
import { ROLES_BY_ID } from "@/data/roles";

/**
 * Toutes les opérations de partie passent par ces fonctions serveur.
 * Aucun compte utilisateur : l'identité repose sur le code de partie,
 * le jeton du Maître du Jeu et le jeton d'appareil de chaque joueur.
 */

export interface SeatDTO {
  position: number;
  name: string;
  claimed: boolean;
  mine: boolean;
  /** Rôle visible uniquement par le MJ, par le propriétaire du siège, ou si le rôle est public */
  roleId: string | null;
  publicRole: boolean;
  alive: boolean;
  deathCause: string | null;
  isCaptain: boolean;
  loverGroup: number | null;
  statuses: string[];
  seen: boolean;
}

export interface GameDTO {
  code: string;
  status: string;
  phase: string;
  night: number;
  playerCount: number;
  selection: Record<string, number>;
  centerCards: string[];
  gagHistory: { night: number; position: number }[];
  seats: SeatDTO[];
  isHost: boolean;
  mySeats: number[];
  reveals: { id: string; toPosition: number; targetPosition: number; note: string | null }[];
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";

function makeCode() {
  let out = "";
  for (let i = 0; i < 4; i++)
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

type AnyRow = Record<string, any>;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as {
    from: (t: string) => any;
  };
}

async function loadGame(db: Awaited<ReturnType<typeof admin>>, code: string) {
  const { data, error } = await db
    .from("games")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Partie introuvable");
  return data as AnyRow;
}

async function buildDTO(
  db: Awaited<ReturnType<typeof admin>>,
  game: AnyRow,
  token: string,
): Promise<GameDTO> {
  const isHost = token === game["host_token"];
  const { data: seatRows } = await db
    .from("seats")
    .select("*")
    .eq("game_id", game["id"])
    .order("position");
  const seats = (seatRows ?? []) as AnyRow[];
  const { data: revealRows } = await db
    .from("reveals")
    .select("*")
    .eq("game_id", game["id"])
    .order("created_at", { ascending: false });

  const mySeats = seats
    .filter((s) => s["device_token"] && s["device_token"] === token)
    .map((s) => s["position"] as number);

  return {
    code: game["code"],
    status: game["status"],
    phase: game["phase"],
    night: game["night"],
    playerCount: game["player_count"],
    selection: (game["selection"] ?? {}) as Record<string, number>,
    centerCards: isHost || mySeats.length > 0 ? ((game["center_cards"] ?? []) as string[]) : [],
    gagHistory: (game["gag_history"] ?? []) as { night: number; position: number }[],
    isHost,
    mySeats,
    reveals: ((revealRows ?? []) as AnyRow[])
      .filter((r) => isHost || mySeats.includes(r["to_position"]))
      .map((r) => ({
        id: r["id"],
        toPosition: r["to_position"],
        targetPosition: r["target_position"],
        note: r["note"],
      })),
    seats: seats.map((s) => {
      const mine = !!s["device_token"] && s["device_token"] === token;
      const visible = isHost || mine || s["public_role"];
      return {
        position: s["position"],
        name: s["name"] ?? "",
        claimed: !!s["device_token"],
        mine,
        roleId: visible ? (s["role_id"] ?? null) : null,
        publicRole: !!s["public_role"],
        alive: !!s["alive"],
        deathCause: s["death_cause"] ?? null,
        isCaptain: !!s["is_captain"],
        loverGroup: s["lover_group"] ?? null,
        statuses: (s["statuses"] ?? []) as string[],
        seen: !!s["seen"],
      };
    }),
  };
}

async function requireHost(db: Awaited<ReturnType<typeof admin>>, code: string, token: string) {
  const game = await loadGame(db, code);
  if (game["host_token"] !== token) throw new Error("Réservé au Maître du Jeu");
  return game;
}

/* ------------------------------------------------------------------ */

export const createGame = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      hostToken: string;
      playerCount: number;
      selection: Record<string, number>;
      thiefVariant?: "centre" | "echange";
    }) => d,
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const count = Math.max(7, Math.min(30, Math.floor(data.playerCount)));

    let code = makeCode();
    for (let attempt = 0; attempt < 8; attempt++) {
      const { data: existing } = await db
        .from("games")
        .select("id")
        .eq("code", code)
        .maybeSingle();
      if (!existing) break;
      code = makeCode();
    }

    const { data: game, error } = await db
      .from("games")
      .insert({
        code,
        host_token: data.hostToken,
        player_count: count,
        selection: data.selection,
        status: "lobby",
        phase: "lobby",
        thief_variant: data.thiefVariant ?? "centre",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await db.from("seats").insert(
      Array.from({ length: count }, (_, i) => ({
        game_id: game["id"],
        position: i + 1,
        name: "",
      })),
    );

    return { code: game["code"] as string };
  });

export const fetchGame = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string }) => d)
  .handler(async ({ data }) => {
    const db = await admin();
    const game = await loadGame(db, data.code);
    return buildDTO(db, game, data.token);
  });

/** Un appareil réclame une ou plusieurs places libres (téléphone partagé). */
export const claimSeats = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; count: number }) => d)
  .handler(async ({ data }) => {
    const db = await admin();
    const game = await loadGame(db, data.code);
    if (game["status"] !== "lobby") throw new Error("La partie a déjà commencé");

    const { data: seatRows } = await db
      .from("seats")
      .select("*")
      .eq("game_id", game["id"])
      .order("position");
    const seats = (seatRows ?? []) as AnyRow[];
    const already = seats.filter((s) => s["device_token"] === data.token);
    const wanted = Math.max(1, Math.min(6, Math.floor(data.count)));
    const missing = wanted - already.length;

    if (missing > 0) {
      const free = seats.filter((s) => !s["device_token"]).slice(0, missing);
      if (free.length < missing) throw new Error("Plus assez de places libres");
      for (const s of free) {
        await db.from("seats").update({ device_token: data.token }).eq("id", s["id"]);
      }
    } else if (missing < 0) {
      for (const s of already.slice(wanted)) {
        await db
          .from("seats")
          .update({ device_token: null, name: "" })
          .eq("id", s["id"]);
      }
    }

    const fresh = await loadGame(db, data.code);
    return buildDTO(db, fresh, data.token);
  });

export const setSeatName = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; position: number; name: string }) => d)
  .handler(async ({ data }) => {
    const db = await admin();
    const game = await loadGame(db, data.code);
    const isHost = game["host_token"] === data.token;
    const q = db
      .from("seats")
      .update({ name: data.name.slice(0, 24) })
      .eq("game_id", game["id"])
      .eq("position", data.position);
    if (!isHost) q.eq("device_token", data.token);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return buildDTO(db, game, data.token);
  });

/** Le MJ récupère une place non réclamée sur son propre téléphone. */
export const hostTakeSeat = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; position: number; take: boolean }) => d)
  .handler(async ({ data }) => {
    const db = await admin();
    const game = await requireHost(db, data.code, data.token);
    await db
      .from("seats")
      .update({ device_token: data.take ? data.token : null })
      .eq("game_id", game["id"])
      .eq("position", data.position);
    return buildDTO(db, game, data.token);
  });

export const dealCards = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string }) => d)
  .handler(async ({ data }) => {
    const db = await admin();
    const game = await requireHost(db, data.code, data.token);

    const selection = (game["selection"] ?? {}) as Record<string, number>;
    const pool: string[] = [];
    Object.entries(selection).forEach(([roleId, n]) => {
      for (let i = 0; i < n; i++) pool.push(roleId);
    });
    const count = game["player_count"] as number;
    const withThief = pool.includes("voleur") && game["thief_variant"] === "centre";
    if (pool.length !== count + (withThief ? 2 : 0)) {
      throw new Error("La composition ne correspond pas au nombre de joueurs");
    }

    const shuffled = shuffle(pool);
    const dealt = shuffled.slice(0, count);
    const center = withThief ? shuffled.slice(count, count + 2) : [];

    for (let i = 0; i < count; i++) {
      await db
        .from("seats")
        .update({ role_id: dealt[i], seen: false })
        .eq("game_id", game["id"])
        .eq("position", i + 1);
    }
    await db
      .from("games")
      .update({ status: "dealt", phase: "nuit", night: 1, center_cards: center })
      .eq("id", game["id"]);

    const fresh = await loadGame(db, data.code);
    return buildDTO(db, fresh, data.token);
  });

export const markSeen = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; position: number }) => d)
  .handler(async ({ data }) => {
    const db = await admin();
    const game = await loadGame(db, data.code);
    await db
      .from("seats")
      .update({ seen: true })
      .eq("game_id", game["id"])
      .eq("position", data.position)
      .eq("device_token", data.token);
    return buildDTO(db, game, data.token);
  });

/** Voleur : prend une des deux cartes du centre (variante « centre »)
 *  ou échange sa carte avec un joueur (variante « échange »). */
export const thiefChoose = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      code: string;
      token: string;
      position: number;
      centerRoleId?: string;
      swapWith?: number;
    }) => d,
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const game = await loadGame(db, data.code);
    const { data: me } = await db
      .from("seats")
      .select("*")
      .eq("game_id", game["id"])
      .eq("position", data.position)
      .maybeSingle();
    if (!me || me["role_id"] !== "voleur") throw new Error("Action réservée au Voleur");

    if (data.centerRoleId) {
      const center = [...((game["center_cards"] ?? []) as string[])];
      const idx = center.indexOf(data.centerRoleId);
      if (idx === -1) throw new Error("Carte indisponible");
      center[idx] = "voleur";
      await db.from("seats").update({ role_id: data.centerRoleId }).eq("id", me["id"]);
      await db.from("games").update({ center_cards: center }).eq("id", game["id"]);
    } else if (data.swapWith) {
      const { data: other } = await db
        .from("seats")
        .select("*")
        .eq("game_id", game["id"])
        .eq("position", data.swapWith)
        .maybeSingle();
      if (!other) throw new Error("Joueur introuvable");
      await db.from("seats").update({ role_id: other["role_id"] }).eq("id", me["id"]);
      await db.from("seats").update({ role_id: "voleur", seen: false }).eq("id", other["id"]);
    }

    const fresh = await loadGame(db, data.code);
    return buildDTO(db, fresh, data.token);
  });

/* --------------------------- Maître du Jeu -------------------------- */

export const setDead = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { code: string; token: string; position: number; alive: boolean; cause?: string }) => d,
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const game = await requireHost(db, data.code, data.token);
    const { data: seatRows } = await db.from("seats").select("*").eq("game_id", game["id"]);
    const seats = (seatRows ?? []) as AnyRow[];
    const target = seats.find((s) => s["position"] === data.position);
    if (!target) throw new Error("Joueur introuvable");

    const maxOrder = Math.max(0, ...seats.map((s) => (s["death_order"] as number) ?? 0));

    if (!data.alive) {
      await db
        .from("seats")
        .update({
          alive: false,
          death_cause: data.cause ?? "inconnue",
          death_order: maxOrder + 1,
        })
        .eq("id", target["id"]);

      // Cascade des amoureux
      if (target["lover_group"]) {
        const lovers = seats.filter(
          (s) =>
            s["lover_group"] === target["lover_group"] &&
            s["id"] !== target["id"] &&
            s["alive"],
        );
        for (const l of lovers) {
          await db
            .from("seats")
            .update({ alive: false, death_cause: "chagrin", death_order: maxOrder + 2 })
            .eq("id", l["id"]);
        }
      }
    } else {
      await db
        .from("seats")
        .update({ alive: true, death_cause: null, death_order: null })
        .eq("id", target["id"]);
    }

    const fresh = await loadGame(db, data.code);
    return buildDTO(db, fresh, data.token);
  });

export const setCaptain = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; position: number | null }) => d)
  .handler(async ({ data }) => {
    const db = await admin();
    const game = await requireHost(db, data.code, data.token);
    await db.from("seats").update({ is_captain: false }).eq("game_id", game["id"]);
    if (data.position) {
      await db
        .from("seats")
        .update({ is_captain: true })
        .eq("game_id", game["id"])
        .eq("position", data.position);
    }
    return buildDTO(db, game, data.token);
  });

export const setLovers = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; positions: number[] }) => d)
  .handler(async ({ data }) => {
    const db = await admin();
    const game = await requireHost(db, data.code, data.token);
    await db.from("seats").update({ lover_group: null }).eq("game_id", game["id"]);
    for (const p of data.positions.slice(0, 2)) {
      await db
        .from("seats")
        .update({ lover_group: 1 })
        .eq("game_id", game["id"])
        .eq("position", p);
    }
    return buildDTO(db, game, data.token);
  });

export const setPublicRole = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; position: number; value: boolean }) => d)
  .handler(async ({ data }) => {
    const db = await admin();
    const game = await requireHost(db, data.code, data.token);
    await db
      .from("seats")
      .update({ public_role: data.value })
      .eq("game_id", game["id"])
      .eq("position", data.position);
    return buildDTO(db, game, data.token);
  });

/** Garde Champêtre : bâillonne un joueur pour le débat du lendemain.
 *  Interdit de re-viser quelqu'un bâillonné lors des 3 dernières nuits. */
export const gagPlayer = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; position: number }) => d)
  .handler(async ({ data }) => {
    const db = await admin();
    const game = await requireHost(db, data.code, data.token);
    const night = (game["night"] as number) ?? 1;
    const history = ((game["gag_history"] ?? []) as { night: number; position: number }[]) ?? [];

    if (history.some((h) => h.position === data.position && night - h.night < 3)) {
      throw new Error("Ce joueur a déjà été bâillonné il y a moins de trois nuits");
    }

    const { data: seatRows } = await db.from("seats").select("*").eq("game_id", game["id"]);
    for (const s of (seatRows ?? []) as AnyRow[]) {
      const statuses = ((s["statuses"] ?? []) as string[]).filter((x) => x !== "baillonne");
      if (s["position"] === data.position) statuses.push("baillonne");
      await db.from("seats").update({ statuses }).eq("id", s["id"]);
    }

    await db
      .from("games")
      .update({ gag_history: [...history, { night, position: data.position }] })
      .eq("id", game["id"]);

    const fresh = await loadGame(db, data.code);
    return buildDTO(db, fresh, data.token);
  });

export const setPhase = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; phase: "nuit" | "jour"; night?: number }) => d)
  .handler(async ({ data }) => {
    const db = await admin();
    const game = await requireHost(db, data.code, data.token);
    const patch: AnyRow = { phase: data.phase };
    if (typeof data.night === "number") patch["night"] = data.night;
    // le bâillon tombe quand une nouvelle nuit commence
    if (data.phase === "nuit") {
      const { data: seatRows } = await db.from("seats").select("*").eq("game_id", game["id"]);
      for (const s of (seatRows ?? []) as AnyRow[]) {
        const statuses = ((s["statuses"] ?? []) as string[]).filter((x) => x !== "baillonne");
        await db.from("seats").update({ statuses }).eq("id", s["id"]);
      }
    }
    await db.from("games").update(patch).eq("id", game["id"]);
    const fresh = await loadGame(db, data.code);
    return buildDTO(db, fresh, data.token);
  });

/** Révélation privée : le MJ envoie le rôle d'un joueur à un autre joueur (Voyante, Renard…). */
export const pushReveal = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { code: string; token: string; toPosition: number; targetPosition: number }) => d,
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const game = await requireHost(db, data.code, data.token);
    const { data: target } = await db
      .from("seats")
      .select("*")
      .eq("game_id", game["id"])
      .eq("position", data.targetPosition)
      .maybeSingle();
    const roleName = ROLES_BY_ID[target?.["role_id"] ?? ""]?.name ?? "inconnu";
    await db.from("reveals").insert({
      game_id: game["id"],
      to_position: data.toPosition,
      target_position: data.targetPosition,
      note: roleName,
    });
    return buildDTO(db, game, data.token);
  });

export const clearReveals = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string }) => d)
  .handler(async ({ data }) => {
    const db = await admin();
    const game = await requireHost(db, data.code, data.token);
    await db.from("reveals").delete().eq("game_id", game["id"]);
    return buildDTO(db, game, data.token);
  });

export const endGame = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string }) => d)
  .handler(async ({ data }) => {
    const db = await admin();
    const game = await requireHost(db, data.code, data.token);
    await db.from("games").update({ status: "ended" }).eq("id", game["id"]);
    return { ok: true };
  });
