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

export interface HostState {
  /** Sorcière : potions encore disponibles */
  potionVie?: boolean;
  potionMort?: boolean;
  /** Joueur de Flûte : positions envoûtées */
  charmed?: number[];
  /** Pouvoirs à rechargement : roleId -> dernière nuit d'utilisation */
  lastUsed?: Record<string, number>;
}

export interface GameDTO {
  code: string;
  status: string;
  phase: string;
  night: number;
  playerCount: number;
  singleDevice: boolean;
  thiefVariant: string;
  selection: Record<string, number>;
  centerCards: string[];
  gagHistory: { night: number; position: number }[];
  hostState: HostState;
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

async function base() {
  const { pb, litteral } = await import("@/lib/pocketbase.server");
  return { pb, litteral };
}

type Base = Awaited<ReturnType<typeof base>>;

/**
 * Un code de partie est toujours quatre lettres de CODE_ALPHABET. On le
 * normalise et on le valide avant de le glisser dans un filtre PocketBase.
 */
function normaliserCode(code: string) {
  const propre = (code ?? "").trim().toUpperCase();
  if (!/^[A-Z]{4}$/.test(propre)) throw new Error("Partie introuvable");
  return propre;
}

/** "" et 0 remplacent les NULL de PostgreSQL dans PocketBase : on les retraduit. */
function vide(valeur: unknown): string | null {
  return typeof valeur === "string" && valeur.length > 0 ? valeur : null;
}

async function loadGame(db: Base, code: string) {
  const data = await db.pb.premier("games", `code = ${db.litteral(normaliserCode(code))}`);
  if (!data) throw new Error("Partie introuvable");
  return data as AnyRow;
}

async function seatsDe(db: Base, gameId: string) {
  return (await db.pb.liste("seats", {
    filtre: `game_id = ${db.litteral(gameId)}`,
    tri: "position",
  })) as AnyRow[];
}

async function buildDTO(db: Base, game: AnyRow, token: string): Promise<GameDTO> {
  const isHost = token === game["host_token"];
  const seats = await seatsDe(db, game["id"]);
  const revealRows = (await db.pb.liste("reveals", {
    filtre: `game_id = ${db.litteral(game["id"])}`,
    tri: "-created",
  })) as AnyRow[];

  const mySeats = seats
    .filter((s) => s["device_token"] && s["device_token"] === token)
    .map((s) => s["position"] as number);

  return {
    code: game["code"],
    status: game["status"],
    phase: game["phase"],
    night: game["night"],
    playerCount: game["player_count"],
    singleDevice: !!game["single_device"],
    thiefVariant: (game["thief_variant"] || "centre") as string,
    selection: (game["selection"] ?? {}) as Record<string, number>,
    // Les deux cartes du centre n'appartiennent qu'au Voleur : elles ne sont
    // envoyées qu'à l'appareil qui porte sa place, et au Maître du Jeu.
    centerCards:
      isHost || seats.some((s) => s["role_id"] === "voleur" && s["device_token"] === token)
        ? ((game["center_cards"] ?? []) as string[])
        : [],
    gagHistory: (game["gag_history"] ?? []) as { night: number; position: number }[],
    hostState: isHost ? ((game["host_state"] ?? {}) as HostState) : {},
    isHost,
    mySeats,
    reveals: revealRows
      .filter((r) => isHost || mySeats.includes(r["to_position"]))
      .map((r) => ({
        id: r["id"],
        toPosition: r["to_position"],
        targetPosition: r["target_position"],
        note: vide(r["note"]),
      })),
    seats: seats.map((s) => {
      const mine = !!s["device_token"] && s["device_token"] === token;
      const visible = isHost || mine || s["public_role"];
      return {
        position: s["position"],
        name: s["name"] ?? "",
        claimed: !!s["device_token"],
        mine,
        roleId: visible ? vide(s["role_id"]) : null,
        publicRole: !!s["public_role"],
        alive: !!s["alive"],
        deathCause: vide(s["death_cause"]),
        isCaptain: !!s["is_captain"],
        loverGroup: (s["lover_group"] as number) || null,
        statuses: (s["statuses"] ?? []) as string[],
        seen: !!s["seen"],
      };
    }),
  };
}

async function requireHost(db: Base, code: string, token: string) {
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
      singleDevice?: boolean;
    }) => d,
  )
  .handler(async ({ data }) => {
    const db = await base();
    const count = Math.max(7, Math.min(30, Math.floor(data.playerCount)));
    const single = !!data.singleDevice;

    let code = makeCode();
    for (let attempt = 0; attempt < 8; attempt++) {
      const existing = await db.pb.premier("games", `code = ${db.litteral(code)}`);
      if (!existing) break;
      code = makeCode();
    }

    const game = await db.pb.creer("games", {
      code,
      host_token: data.hostToken,
      player_count: count,
      selection: data.selection,
      center_cards: [],
      gag_history: [],
      status: "lobby",
      phase: "lobby",
      night: 0,
      thief_variant: data.thiefVariant ?? "centre",
      single_device: single,
      host_state: {
        potionVie: true,
        potionMort: true,
        charmed: [],
        lastUsed: {},
      },
    });

    // Mode « un seul téléphone » : toutes les places sont portées par l'appareil du MJ.
    for (let i = 0; i < count; i++) {
      await db.pb.creer("seats", {
        game_id: game["id"],
        position: i + 1,
        name: "",
        alive: true,
        statuses: [],
        ...(single ? { device_token: data.hostToken } : {}),
      });
    }

    return { code: game["code"] as string };
  });

/** Suivi privé du Maître du Jeu (potions, envoûtés, pouvoirs rechargeables). */
export const setHostState = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; patch: HostState }) => d)
  .handler(async ({ data }) => {
    const db = await base();
    const game = await requireHost(db, data.code, data.token);
    const current = (game["host_state"] ?? {}) as HostState;
    await db.pb.modifier("games", game["id"], {
      host_state: { ...current, ...data.patch },
    });
    const fresh = await loadGame(db, data.code);
    return buildDTO(db, fresh, data.token);
  });

export const fetchGame = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string }) => d)
  .handler(async ({ data }) => {
    const db = await base();
    const game = await loadGame(db, data.code);
    return buildDTO(db, game, data.token);
  });

/** Un appareil réclame une ou plusieurs places libres (téléphone partagé). */
export const claimSeats = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; count: number }) => d)
  .handler(async ({ data }) => {
    const db = await base();
    const game = await loadGame(db, data.code);
    if (game["status"] !== "lobby") throw new Error("La partie a déjà commencé");

    const seats = await seatsDe(db, game["id"]);
    const already = seats.filter((s) => s["device_token"] === data.token);
    const wanted = Math.max(1, Math.min(6, Math.floor(data.count)));
    const missing = wanted - already.length;

    if (missing > 0) {
      const free = seats.filter((s) => !s["device_token"]).slice(0, missing);
      if (free.length < missing) throw new Error("Plus assez de places libres");
      for (const s of free) {
        await db.pb.modifier("seats", s["id"], { device_token: data.token });
      }
    } else if (missing < 0) {
      for (const s of already.slice(wanted)) {
        await db.pb.modifier("seats", s["id"], { device_token: "", name: "" });
      }
    }

    const fresh = await loadGame(db, data.code);
    return buildDTO(db, fresh, data.token);
  });

export const setSeatName = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; position: number; name: string }) => d)
  .handler(async ({ data }) => {
    const db = await base();
    const game = await loadGame(db, data.code);
    const isHost = game["host_token"] === data.token;
    const seats = await seatsDe(db, game["id"]);
    const cible = seats.find((s) => s["position"] === data.position);
    // Le MJ renomme n'importe quelle place ; un joueur seulement les siennes.
    if (cible && (isHost || cible["device_token"] === data.token)) {
      await db.pb.modifier("seats", cible["id"], { name: data.name.slice(0, 24) });
    }
    return buildDTO(db, game, data.token);
  });

/** Le MJ récupère une place non réclamée sur son propre téléphone. */
export const hostTakeSeat = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; position: number; take: boolean }) => d)
  .handler(async ({ data }) => {
    const db = await base();
    const game = await requireHost(db, data.code, data.token);
    const seats = await seatsDe(db, game["id"]);
    const cible = seats.find((s) => s["position"] === data.position);
    if (cible) {
      await db.pb.modifier("seats", cible["id"], {
        device_token: data.take ? data.token : "",
      });
    }
    return buildDTO(db, game, data.token);
  });

export const dealCards = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string }) => d)
  .handler(async ({ data }) => {
    const db = await base();
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

    const seats = await seatsDe(db, game["id"]);
    for (let i = 0; i < count; i++) {
      const cible = seats.find((s) => s["position"] === i + 1);
      if (cible) {
        await db.pb.modifier("seats", cible["id"], { role_id: dealt[i], seen: false });
      }
    }
    await db.pb.modifier("games", game["id"], {
      status: "dealt",
      phase: "nuit",
      night: 1,
      center_cards: center,
    });

    const fresh = await loadGame(db, data.code);
    return buildDTO(db, fresh, data.token);
  });

export const markSeen = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; position: number }) => d)
  .handler(async ({ data }) => {
    const db = await base();
    const game = await loadGame(db, data.code);
    const seats = await seatsDe(db, game["id"]);
    const cible = seats.find(
      (s) => s["position"] === data.position && s["device_token"] === data.token,
    );
    if (cible) await db.pb.modifier("seats", cible["id"], { seen: true });
    return buildDTO(db, game, data.token);
  });

/** Le MJ rouvre une carte déjà consultée, pour un joueur qui a oublié la sienne.
 *  Sans cela, une carte vue reste verrouillée : c'est ce qui empêche un joueur
 *  de repasser en revue toutes les places sur un téléphone partagé. */
export const resetSeen = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; position: number }) => d)
  .handler(async ({ data }) => {
    const db = await base();
    const game = await requireHost(db, data.code, data.token);
    const seats = await seatsDe(db, game["id"]);
    const cible = seats.find((s) => s["position"] === data.position);
    if (cible) await db.pb.modifier("seats", cible["id"], { seen: false });
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
    const db = await base();
    const game = await loadGame(db, data.code);
    const seats = await seatsDe(db, game["id"]);
    const me = seats.find((s) => s["position"] === data.position);
    if (!me || me["role_id"] !== "voleur") throw new Error("Action réservée au Voleur");
    // Porter la carte ne suffit pas : il faut aussi tenir l'appareil qui porte
    // cette place (ou être le Maître du Jeu), sinon n'importe quel joueur
    // connaissant le code de partie pourrait voler à la place du Voleur.
    const proprietaire = me["device_token"] === data.token || game["host_token"] === data.token;
    if (!proprietaire) throw new Error("Action réservée au Voleur");

    if (data.centerRoleId) {
      const center = [...((game["center_cards"] ?? []) as string[])];
      const idx = center.indexOf(data.centerRoleId);
      if (idx === -1) throw new Error("Carte indisponible");
      center[idx] = "voleur";
      await db.pb.modifier("seats", me["id"], { role_id: data.centerRoleId });
      await db.pb.modifier("games", game["id"], { center_cards: center });
    } else if (data.swapWith) {
      const other = seats.find((s) => s["position"] === data.swapWith);
      if (!other) throw new Error("Joueur introuvable");
      await db.pb.modifier("seats", me["id"], { role_id: other["role_id"] });
      await db.pb.modifier("seats", other["id"], { role_id: "voleur", seen: false });
    }

    const fresh = await loadGame(db, data.code);
    return buildDTO(db, fresh, data.token);
  });

/* --------------------------- Maître du Jeu -------------------------- */

export const setDead = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      code: string;
      token: string;
      position: number;
      alive: boolean;
      cause?: string | undefined;
    }) => d,
  )
  .handler(async ({ data }) => {
    const db = await base();
    const game = await requireHost(db, data.code, data.token);
    const seats = await seatsDe(db, game["id"]);
    const target = seats.find((s) => s["position"] === data.position);
    if (!target) throw new Error("Joueur introuvable");

    const maxOrder = Math.max(0, ...seats.map((s) => (s["death_order"] as number) ?? 0));

    if (!data.alive) {
      await db.pb.modifier("seats", target["id"], {
        alive: false,
        death_cause: data.cause ?? "inconnue",
        death_order: maxOrder + 1,
      });

      // Cascade des amoureux
      if (target["lover_group"]) {
        const lovers = seats.filter(
          (s) =>
            s["lover_group"] === target["lover_group"] && s["id"] !== target["id"] && s["alive"],
        );
        for (const l of lovers) {
          await db.pb.modifier("seats", l["id"], {
            alive: false,
            death_cause: "chagrin",
            death_order: maxOrder + 2,
          });
        }
      }
    } else {
      await db.pb.modifier("seats", target["id"], {
        alive: true,
        death_cause: "",
        death_order: 0,
      });
    }

    const fresh = await loadGame(db, data.code);
    return buildDTO(db, fresh, data.token);
  });

export const setCaptain = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; position: number | null }) => d)
  .handler(async ({ data }) => {
    const db = await base();
    const game = await requireHost(db, data.code, data.token);
    const seats = await seatsDe(db, game["id"]);
    for (const s of seats) {
      if (s["is_captain"]) await db.pb.modifier("seats", s["id"], { is_captain: false });
    }
    if (data.position) {
      const cible = seats.find((s) => s["position"] === data.position);
      if (cible) await db.pb.modifier("seats", cible["id"], { is_captain: true });
    }
    return buildDTO(db, game, data.token);
  });

export const setLovers = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; positions: number[] }) => d)
  .handler(async ({ data }) => {
    const db = await base();
    const game = await requireHost(db, data.code, data.token);
    const seats = await seatsDe(db, game["id"]);
    for (const s of seats) {
      if (s["lover_group"]) await db.pb.modifier("seats", s["id"], { lover_group: 0 });
    }
    for (const p of data.positions.slice(0, 2)) {
      const cible = seats.find((s) => s["position"] === p);
      if (cible) await db.pb.modifier("seats", cible["id"], { lover_group: 1 });
    }
    return buildDTO(db, game, data.token);
  });

export const setPublicRole = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; position: number; value: boolean }) => d)
  .handler(async ({ data }) => {
    const db = await base();
    const game = await requireHost(db, data.code, data.token);
    const seats = await seatsDe(db, game["id"]);
    const cible = seats.find((s) => s["position"] === data.position);
    if (cible) await db.pb.modifier("seats", cible["id"], { public_role: data.value });
    return buildDTO(db, game, data.token);
  });

/** Garde Champêtre : bâillonne un joueur pour le débat du lendemain.
 *  Interdit de re-viser quelqu'un bâillonné lors des 3 dernières nuits. */
export const gagPlayer = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; position: number }) => d)
  .handler(async ({ data }) => {
    const db = await base();
    const game = await requireHost(db, data.code, data.token);
    const night = (game["night"] as number) ?? 1;
    const history = (game["gag_history"] ?? []) as { night: number; position: number }[];

    if (history.some((h) => h.position === data.position && night - h.night < 3)) {
      throw new Error("Ce joueur a déjà été bâillonné il y a moins de trois nuits");
    }

    const seats = await seatsDe(db, game["id"]);
    for (const s of seats) {
      const avant = (s["statuses"] ?? []) as string[];
      const statuses = avant.filter((x) => x !== "baillonne");
      if (s["position"] === data.position) statuses.push("baillonne");
      if (statuses.length !== avant.length || statuses.includes("baillonne")) {
        await db.pb.modifier("seats", s["id"], { statuses });
      }
    }

    await db.pb.modifier("games", game["id"], {
      gag_history: [...history, { night, position: data.position }],
    });

    const fresh = await loadGame(db, data.code);
    return buildDTO(db, fresh, data.token);
  });

export const setPhase = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; phase: "nuit" | "jour"; night?: number }) => d)
  .handler(async ({ data }) => {
    const db = await base();
    const game = await requireHost(db, data.code, data.token);
    const patch: AnyRow = { phase: data.phase };
    if (typeof data.night === "number") patch["night"] = data.night;
    // le bâillon tombe quand une nouvelle nuit commence
    if (data.phase === "nuit") {
      const seats = await seatsDe(db, game["id"]);
      for (const s of seats) {
        const avant = (s["statuses"] ?? []) as string[];
        if (avant.includes("baillonne")) {
          await db.pb.modifier("seats", s["id"], {
            statuses: avant.filter((x) => x !== "baillonne"),
          });
        }
      }
    }
    await db.pb.modifier("games", game["id"], patch);
    const fresh = await loadGame(db, data.code);
    return buildDTO(db, fresh, data.token);
  });

/** Révélation privée : le MJ envoie le rôle d'un joueur à un autre joueur (Voyante, Renard…). */
export const pushReveal = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { code: string; token: string; toPosition: number; targetPosition: number }) => d,
  )
  .handler(async ({ data }) => {
    const db = await base();
    const game = await requireHost(db, data.code, data.token);
    const seats = await seatsDe(db, game["id"]);
    const target = seats.find((s) => s["position"] === data.targetPosition);
    const roleName = ROLES_BY_ID[target?.["role_id"] ?? ""]?.name ?? "inconnu";
    await db.pb.creer("reveals", {
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
    const db = await base();
    const game = await requireHost(db, data.code, data.token);
    const revealRows = await db.pb.liste("reveals", {
      filtre: `game_id = ${db.litteral(game["id"])}`,
    });
    for (const r of revealRows) await db.pb.supprimer("reveals", r["id"]);
    return buildDTO(db, game, data.token);
  });

export const endGame = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string }) => d)
  .handler(async ({ data }) => {
    const db = await base();
    const game = await requireHost(db, data.code, data.token);
    await db.pb.modifier("games", game["id"], { status: "ended" });
    return { ok: true };
  });
