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
  /** Cause précise — réservée au Maître du Jeu. */
  deathCause: string | null;
  /** « nuit » ou « jour » : le seul détail que voient les joueurs éliminés. */
  deathPhase: string | null;
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
  /** Salvateur : cible de la nuit précédente, interdite cette nuit */
  protectionPrecedente?: number;
  /** Ancien : a-t-il déjà encaissé sa première attaque de Loups ? */
  ancienDejaAttaque?: boolean;
  /** Infect Père des Loups : son infection unique a-t-elle été jouée ? */
  infectionUtilisee?: boolean;
  /** Enfant Sauvage : position de son modèle */
  modele?: number;
  /** Positions passées côté Loups en cours de partie (infection, transformation) */
  devenusLoups?: number[];
  /** Rôles dont le pouvoir à usage unique a été consommé (roleId) */
  pouvoirsUtilises?: string[];
  /** Chien-Loup : camp choisi la première nuit, définitif et secret */
  chienLoup?: "villageois" | "loups";
  /** L'Ancien a été éliminé au vote : tous les villageois perdent leur pouvoir */
  villageSansPouvoirs?: boolean;
}

/**
 * Actions enregistrées pendant la nuit en cours.
 *
 * Rien n'est appliqué au fil de l'eau : une victime des Loups peut encore
 * être sauvée par le Salvateur ou la Sorcière. Tout se résout d'un coup au
 * lever du jour, dans `resolveNight`.
 */
export interface NuitEnCours {
  /** Index de l'étape atteinte dans l'ordre d'appel */
  etape?: number;
  /** Salvateur */
  protection?: number;
  /** Victime désignée par la meute */
  victimeLoups?: number;
  /** Grand Méchant Loup */
  secondeVictime?: number;
  /** Loup-Garou Blanc */
  loupBlanc?: number;
  /** Infect Père : la victime des Loups est infectée au lieu d'être dévorée */
  infection?: boolean;
  /** Sorcière */
  soin?: number;
  poison?: number;
  /** Enfant Sauvage : modèle désigné la première nuit, recopié dans hostState */
  modele?: number;
  /** Chien-Loup : camp choisi la première nuit, recopié dans hostState */
  chienLoup?: "villageois" | "loups";
  /** Voyante : joueur sondé cette nuit */
  voyante?: number;
  /** Renard : joueur central du trio flairé cette nuit */
  renard?: number;
  /** Joueur de Flûte : les deux joueurs envoûtés cette nuit */
  charmes?: number[];
  /** Voleur : place avec qui il a échangé, pour le rappel du matin */
  voleurEchange?: number;
  /** Morts ajoutées à la main (variantes maison) */
  autres?: { position: number; cause: string }[];
}

/**
 * Modification du journal de nuit. Une valeur `null` efface la clé : c'est
 * ainsi que le MJ revient sur une désignation.
 */
export type PatchNuit = { [K in keyof NuitEnCours]?: NuitEnCours[K] | null };

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
  /** Actions de la nuit en cours — visible du seul Maître du Jeu */
  nuit: NuitEnCours;
  seats: SeatDTO[];
  isHost: boolean;
  mySeats: number[];
  /** L'appareil a au moins une place éliminée : il peut consulter le cimetière. */
  voitLeCimetiere: boolean;
  reveals: { id: string; toPosition: number; targetPosition: number; note: string | null }[];
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Entier aléatoire dans [0, borne[, tiré du générateur cryptographique.
 *
 * Math.random() ne convenait ni pour les codes de partie (devinables) ni
 * pour la distribution des cartes (état interne prévisible après quelques
 * tirages). Le rejet des valeurs hautes évite le biais du modulo, qui
 * favoriserait les premières lettres de l'alphabet et les premières cartes
 * du paquet.
 */
function entierAleatoire(borne: number): number {
  if (borne <= 0) return 0;
  const max = Math.floor(0x100000000 / borne) * borne;
  const tampon = new Uint32Array(1);
  let valeur: number;
  do {
    crypto.getRandomValues(tampon);
    valeur = tampon[0]!;
  } while (valeur >= max);
  return valeur % borne;
}

function makeCode() {
  let out = "";
  for (let i = 0; i < 4; i++) out += CODE_ALPHABET[entierAleatoire(CODE_ALPHABET.length)];
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = entierAleatoire(i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

type AnyRow = Record<string, any>;

/**
 * Nombre de places qu'un même appareil peut porter, hors mode « un seul
 * téléphone » où le Maître du Jeu les porte toutes. Au-delà de trois, la
 * carte du voisin finit toujours par être vue.
 */
export const PLACES_MAX_PAR_APPAREIL = 3;

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

  // Un joueur éliminé a le droit de suivre la partie : dans le jeu physique,
  // il garde les yeux ouverts et voit tout. Dès qu'une de ses places est
  // morte, cet appareil voit le rôle de tous les joueurs éliminés.
  const voitLeCimetiere = isHost || seats.some((s) => s["device_token"] === token && !s["alive"]);

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
    nuit: isHost ? ((game["nuit"] ?? {}) as NuitEnCours) : {},
    isHost,
    mySeats,
    voitLeCimetiere,
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
      const visible = isHost || mine || s["public_role"] || (voitLeCimetiere && !s["alive"]);
      return {
        position: s["position"],
        name: s["name"] ?? "",
        claimed: !!s["device_token"],
        mine,
        roleId: visible ? vide(s["role_id"]) : null,
        publicRole: !!s["public_role"],
        alive: !!s["alive"],
        deathCause: isHost ? vide(s["death_cause"]) : null,
        deathPhase: vide(s["death_phase"]),
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

    // Ménage : une partie ne vit qu'une soirée, jamais plusieurs jours. On
    // profite de la création d'une nouvelle partie pour effacer celles qui
    // n'ont pas bougé depuis vingt-quatre heures ; la suppression en cascade
    // emporte les places et les révélations associées.
    try {
      const limite = new Date(Date.now() - 24 * 3600 * 1000)
        .toISOString()
        .replace("T", " ")
        .slice(0, 19);
      const perimees = await db.pb.liste("games", {
        filtre: `updated < ${db.litteral(limite)}`,
        parPage: 50,
      });
      for (const vieille of perimees) await db.pb.supprimer("games", vieille["id"]);
    } catch {
      // Le ménage ne doit jamais empêcher de lancer une partie.
    }

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
        devenusLoups: [],
      },
      nuit: {},
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
    // Trois places maximum par appareil : au-delà, le téléphone circule trop
    // dans la même main et le secret des cartes ne tient plus. On refuse la
    // demande au lieu de la rogner en silence : un client qui demande plus a
    // un bug ou tente de contourner la limite, dans les deux cas il doit le
    // savoir.
    const demande = Math.floor(data.count);
    if (!Number.isFinite(demande) || demande < 1 || demande > PLACES_MAX_PAR_APPAREIL) {
      throw new Error(`Un téléphone porte au maximum ${PLACES_MAX_PAR_APPAREIL} joueurs`);
    }
    const wanted = demande;
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

/**
 * Le MJ déplace un joueur d'un cran dans l'ordre des places.
 *
 * Les places sont numérotées dans l'ordre où les téléphones les réclament,
 * ce qui n'a aucune raison de correspondre à l'ordre réel autour de la
 * table. Or le Renard et le Montreur d'Ours raisonnent sur les voisins :
 * sans cet ordre, leurs pouvoirs sont faux. Le MJ range donc la liste pour
 * qu'elle suive la table.
 *
 * On échange le contenu des deux places (le joueur et sa carte), pas leurs
 * numéros : les positions restent 1..N, sans trou.
 */
export const moveSeat = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; position: number; vers: "haut" | "bas" }) => d)
  .handler(async ({ data }) => {
    const db = await base();
    const game = await requireHost(db, data.code, data.token);
    const seats = await seatsDe(db, game["id"]);
    const total = seats.length;
    const depart = seats.find((s) => s["position"] === data.position);
    if (!depart || total < 2) return buildDTO(db, game, data.token);

    // La table est un cercle : le premier remonte à la dernière place.
    const cible =
      data.vers === "haut"
        ? ((data.position - 2 + total) % total) + 1
        : (data.position % total) + 1;
    const arrivee = seats.find((s) => s["position"] === cible);
    if (!arrivee) return buildDTO(db, game, data.token);

    const CHAMPS = [
      "name",
      "role_id",
      "alive",
      "death_cause",
      "death_order",
      "is_captain",
      "lover_group",
      "statuses",
      "public_role",
      "device_token",
      "seen",
    ];
    const contenu = (s: AnyRow) => Object.fromEntries(CHAMPS.map((c) => [c, s[c]]));
    const aDepart = contenu(depart);
    const aArrivee = contenu(arrivee);
    await db.pb.modifier("seats", depart["id"], aArrivee);
    await db.pb.modifier("seats", arrivee["id"], aDepart);

    const fresh = await loadGame(db, data.code);
    return buildDTO(db, fresh, data.token);
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
        // Le Villageois-Villageois a deux faces de villageois : sa carte est
        // publique par nature. On la révèle d'emblée à toute la table plutôt
        // que de compter sur une annonce orale du MJ.
        await db.pb.modifier("seats", cible["id"], {
          role_id: dealt[i],
          seen: false,
          public_role: dealt[i] === "villageois-villageois",
          death_phase: "",
        });
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

/**
 * Voleur, variante « vol de rôle » : le MJ échange la carte du Voleur avec
 * celle d'un autre joueur. Les deux verront une carte différente au réveil,
 * d'où la remise à zéro de `seen` : l'application leur redemandera de la
 * consulter.
 */
export const thiefSwap = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; position: number; avec: number }) => d)
  .handler(async ({ data }) => {
    const db = await base();
    const game = await requireHost(db, data.code, data.token);
    const seats = await seatsDe(db, game["id"]);
    const voleur = seats.find((s) => s["position"] === data.position);
    const cible = seats.find((s) => s["position"] === data.avec);
    if (!voleur || !cible) throw new Error("Joueur introuvable");
    if (voleur["id"] === cible["id"]) throw new Error("Le Voleur ne peut pas se voler lui-même");

    await db.pb.modifier("seats", voleur["id"], { role_id: cible["role_id"], seen: false });
    await db.pb.modifier("seats", cible["id"], { role_id: voleur["role_id"], seen: false });

    const fresh = await loadGame(db, data.code);
    return buildDTO(db, fresh, data.token);
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

    // Idiot du Village : la première fois que le village vote contre lui, sa
    // carte est révélée à tous et il est gracié. Il reste en jeu mais perd
    // définitivement son droit de vote. Une fois révélé, il n'est plus
    // protégé : un second vote l'élimine normalement.
    if (
      !data.alive &&
      data.cause === "vote" &&
      target["role_id"] === "idiot-du-village" &&
      !target["public_role"]
    ) {
      const statuts = ((target["statuses"] ?? []) as string[]).filter((x) => x !== "sans-vote");
      await db.pb.modifier("seats", target["id"], {
        public_role: true,
        statuses: [...statuts, "sans-vote"],
      });
      const apres = await loadGame(db, data.code);
      return buildDTO(db, apres, data.token);
    }

    if (!data.alive) {
      await db.pb.modifier("seats", target["id"], {
        alive: false,
        death_cause: data.cause ?? "inconnue",
        // Le Chasseur tire au vu de tous : c'est le seul détail de cause que
        // les joueurs éliminés ont le droit de voir, avec le jour et la nuit.
        death_phase:
          data.cause === "chasseur"
            ? "chasseur"
            : (game["phase"] as string) === "nuit"
              ? "nuit"
              : "jour",
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
            death_phase: (game["phase"] as string) === "nuit" ? "nuit" : "jour",
            death_order: maxOrder + 2,
          });
        }
      }
    } else {
      await db.pb.modifier("seats", target["id"], {
        alive: true,
        death_cause: "",
        death_phase: "",
        death_order: 0,
      });
    }

    // Ancien tombé sous un coup VILLAGEOIS — vote, poison de la Sorcière ou
    // tir du Chasseur : par dépit, tous les villageois perdent leur pouvoir
    // pour le reste de la partie. Dévoré par les Loups, aucun effet.
    const COUPS_VILLAGEOIS = new Set(["vote", "poison", "chasseur"]);
    if (!data.alive && COUPS_VILLAGEOIS.has(data.cause ?? "") && target["role_id"] === "ancien") {
      const avant = (game["host_state"] ?? {}) as HostState;
      await db.pb.modifier("games", game["id"], {
        host_state: { ...avant, villageSansPouvoirs: true },
      });
    }

    // Le modèle de l'Enfant Sauvage peut aussi tomber au vote du village :
    // la transformation doit être détectée en plein jour, pas seulement à
    // la résolution de la nuit.
    const etat = (game["host_state"] ?? {}) as HostState;
    if (!data.alive && etat.modele === data.position) {
      const enfant = seats.find((s) => s["role_id"] === "enfant-sauvage");
      if (enfant && !(etat.devenusLoups ?? []).includes(enfant["position"] as number)) {
        await db.pb.modifier("games", game["id"], {
          host_state: {
            ...etat,
            devenusLoups: [...(etat.devenusLoups ?? []), enfant["position"] as number],
          },
        });
      }
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

/** Magicien : bâillonne un joueur pour le débat du lendemain.
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

/** Le MJ enregistre une action de la nuit en cours (cible des Loups, potion, protection…). */
export const setNightAction = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; patch: PatchNuit }) => d)
  .handler(async ({ data }) => {
    const db = await base();
    const game = await requireHost(db, data.code, data.token);
    const courante = (game["nuit"] ?? {}) as NuitEnCours;
    const fusion = { ...courante, ...data.patch } as NuitEnCours;
    // Une valeur nulle efface la cible (le MJ revient sur son choix).
    for (const [cle, valeur] of Object.entries(data.patch)) {
      if (valeur === null) delete (fusion as Record<string, unknown>)[cle];
    }
    await db.pb.modifier("games", game["id"], { nuit: fusion });
    const fresh = await loadGame(db, data.code);
    return buildDTO(db, fresh, data.token);
  });

/**
 * Lever du jour : applique d'un coup tout ce qui a été enregistré pendant la nuit.
 *
 * L'ordre compte. Une victime des Loups peut être protégée par le Salvateur,
 * soignée par la Sorcière, infectée par l'Infect Père, ou survivre parce
 * qu'elle est l'Ancien. Le poison, lui, ignore la protection. Les Amoureux
 * suivent en dernier, une fois les morts établies.
 */
export const resolveNight = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string }) => d)
  .handler(async ({ data }) => {
    const db = await base();
    const game = await requireHost(db, data.code, data.token);
    const seats = await seatsDe(db, game["id"]);
    const nuit = (game["nuit"] ?? {}) as NuitEnCours;
    const etat = (game["host_state"] ?? {}) as HostState;

    const parPosition = (p?: number) =>
      p === undefined ? undefined : seats.find((s) => s["position"] === p);

    const morts: { position: number; cause: string }[] = [];
    const sauves: { position: number; raison: string }[] = [];
    const patchEtat: HostState = {};
    let infecte: number | undefined;

    /**
     * Une attaque de Loups, avec toutes ses parades, dans l'ordre du livret.
     *
     * L'Ancien passe en premier : à sa première morsure il résiste, et n'est
     * pas non plus affecté par l'Infect Père des Loups. L'infection vient
     * ensuite, car le Salvateur ne protège pas de l'infection. Et sa
     * protection ne donne aucun résultat sur la Petite Fille.
     */
    function attaqueLoups(cible: number | undefined, peutEtreInfecte: boolean) {
      if (cible === undefined) return;
      const siege = parPosition(cible);
      if (!siege || !siege["alive"]) return;

      if (siege["role_id"] === "ancien" && !etat.ancienDejaAttaque) {
        patchEtat.ancienDejaAttaque = true;
        sauves.push({
          position: cible,
          raison: "l'Ancien encaisse sa première morsure (et résiste à l'infection)",
        });
        return;
      }
      if (peutEtreInfecte && nuit.infection && !etat.infectionUtilisee) {
        infecte = cible;
        patchEtat.infectionUtilisee = true;
        sauves.push({ position: cible, raison: "infecté : il rejoint les Loups-Garous" });
        return;
      }
      if (nuit.protection === cible && siege["role_id"] !== "petite-fille") {
        sauves.push({ position: cible, raison: "protégé par le Salvateur" });
        return;
      }
      if (nuit.protection === cible && siege["role_id"] === "petite-fille") {
        sauves.push({
          position: cible,
          raison: "protection sans effet : le Salvateur ne protège pas la Petite Fille",
        });
      }
      if (nuit.soin === cible) {
        sauves.push({ position: cible, raison: "soigné par la Sorcière" });
        return;
      }
      morts.push({ position: cible, cause: "loups" });
    }

    attaqueLoups(nuit.victimeLoups, true);
    attaqueLoups(nuit.secondeVictime, false);

    // Le Loup-Garou Blanc frappe un Loup : ni protection ni potion ne jouent ici.
    if (nuit.loupBlanc !== undefined) {
      const siege = parPosition(nuit.loupBlanc);
      if (siege && siege["alive"]) morts.push({ position: nuit.loupBlanc, cause: "loup blanc" });
    }

    // Le poison ignore la protection du Salvateur.
    if (nuit.poison !== undefined) {
      const siege = parPosition(nuit.poison);
      if (siege && siege["alive"]) morts.push({ position: nuit.poison, cause: "poison" });
    }

    for (const autre of nuit.autres ?? []) {
      const siege = parPosition(autre.position);
      if (siege && siege["alive"]) morts.push(autre);
    }

    // Application : d'abord les morts directes, puis la cascade des Amoureux.
    let ordre = Math.max(0, ...seats.map((s) => (s["death_order"] as number) ?? 0));
    const dejaMort = new Set<number>();

    async function tuer(position: number, cause: string) {
      if (dejaMort.has(position)) return;
      const siege = parPosition(position);
      if (!siege || !siege["alive"]) return;
      dejaMort.add(position);
      ordre += 1;
      await db.pb.modifier("seats", siege["id"], {
        alive: false,
        death_cause: cause,
        death_phase: cause === "chasseur" ? "chasseur" : "nuit",
        death_order: ordre,
      });
      siege["alive"] = false;
    }

    for (const m of morts) await tuer(m.position, m.cause);

    // Cascade des Amoureux : un Amoureux mort entraîne l'autre.
    for (const m of [...morts]) {
      const siege = parPosition(m.position);
      const groupe = siege?.["lover_group"];
      if (!groupe) continue;
      for (const autre of seats) {
        if (autre["lover_group"] === groupe && autre["position"] !== m.position) {
          await tuer(autre["position"] as number, "chagrin");
          morts.push({ position: autre["position"] as number, cause: "chagrin" });
        }
      }
    }

    // Enfant Sauvage : si son modèle est mort cette nuit, il devient Loup-Garou.
    let enfantTransforme = false;
    if (etat.modele !== undefined && dejaMort.has(etat.modele)) {
      const enfant = seats.find((s) => s["role_id"] === "enfant-sauvage" && s["alive"]);
      if (enfant) {
        enfantTransforme = true;
        patchEtat.devenusLoups = [...(etat.devenusLoups ?? []), enfant["position"] as number];
      }
    }

    if (infecte !== undefined) {
      patchEtat.devenusLoups = [...(patchEtat.devenusLoups ?? etat.devenusLoups ?? []), infecte];
    }

    // Ancien empoisonné par la Sorcière : coup villageois, le village perd
    // ses pouvoirs, exactement comme au vote.
    if (nuit.poison !== undefined) {
      const empoisonne = parPosition(nuit.poison);
      if (empoisonne?.["role_id"] === "ancien") patchEtat.villageSansPouvoirs = true;
    }

    // Le modèle de l'Enfant Sauvage est désigné la première nuit, mais il
    // doit survivre à l'effacement du journal : on le recopie dans l'état
    // durable de la partie.
    if (nuit.modele !== undefined) patchEtat.modele = nuit.modele;

    // Joueur de Flûte : les envoûtés de la nuit s'ajoutent aux précédents.
    if (nuit.charmes && nuit.charmes.length > 0) {
      const avant = etat.charmed ?? [];
      patchEtat.charmed = [...new Set([...avant, ...nuit.charmes])];
    }

    // Chien-Loup : son camp est choisi la première nuit et ne change plus.
    // S'il a choisi les Loups, il compte comme tel pour le Montreur d'Ours.
    if (nuit.chienLoup !== undefined) {
      patchEtat.chienLoup = nuit.chienLoup;
      if (nuit.chienLoup === "loups") {
        const chien = seats.find((s) => s["role_id"] === "chien-loup");
        if (chien) {
          patchEtat.devenusLoups = [
            ...(patchEtat.devenusLoups ?? etat.devenusLoups ?? []),
            chien["position"] as number,
          ];
        }
      }
    }

    // Le Salvateur ne pourra pas reprendre la même cible la nuit prochaine.
    patchEtat.protectionPrecedente = nuit.protection ?? 0;
    if (nuit.soin !== undefined) patchEtat.potionVie = false;
    if (nuit.poison !== undefined) patchEtat.potionMort = false;

    await db.pb.modifier("games", game["id"], {
      host_state: { ...etat, ...patchEtat },
      nuit: {},
      phase: "jour",
    });

    const fresh = await loadGame(db, data.code);
    const dto = await buildDTO(db, fresh, data.token);
    return {
      ...dto,
      bilan: {
        morts: morts.filter((m, i, t) => t.findIndex((x) => x.position === m.position) === i),
        sauves,
        infecte: infecte ?? null,
        enfantTransforme,
      },
    };
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
