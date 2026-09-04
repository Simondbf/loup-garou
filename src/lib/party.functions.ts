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
  /**
   * Rang de la mort dans la partie, réservé au Maître du Jeu.
   *
   * C'est ce qui permet au fil de la journée de distinguer les morts de la
   * nuit passée de celles qui viennent de tomber au vote, et de les traiter
   * dans l'ordre où elles sont survenues.
   */
  deathOrder: number;
  isCaptain: boolean;
  loverGroup: number | null;
  statuses: string[];
  seen: boolean;
}

/**
 * Ce qu'un joueur a le droit de retrouver sur son propre téléphone.
 *
 * Jusqu'ici, tout ce qui n'était pas sa carte vivait dans la tête du Maître
 * du Jeu : combien de potions restait-il, qui le Salvateur ne pouvait plus
 * protéger. Le MJ devait le redire à voix basse à chaque réveil, et se
 * tromper une fois suffisait à fausser la partie.
 *
 * Chaque appareil ne reçoit que l'état de ses propres places, et jamais un
 * secret qui se transmet par le Maître du Jeu.
 */
export interface EtatPersonnel {
  position: number;
  /** Sorcière : potions encore en main. */
  potionVie?: boolean;
  potionMort?: boolean;
  /** Salvateur : prénom de celui qu'il ne peut pas reprotéger cette nuit. */
  protectionInterdite?: string;
  /** Loup-Garou Blanc : se réveille-t-il seul la nuit qui vient ? */
  loupBlancCetteNuit?: boolean;
  /** Enfant Sauvage : prénom de son modèle. */
  modele?: string;
  /** Chien-Loup : camp choisi la première nuit. */
  chienLoup?: "villageois" | "loups";
  /** Passé côté Loups-Garous en cours de partie : infection, transformation, choix. */
  passeCoteLoups?: boolean;
  /** Pouvoir à usage unique déjà consommé. */
  pouvoirConsomme?: boolean;
  /** L'Ancien est tombé sous un coup du village : plus aucun pouvoir villageois. */
  villageSansPouvoirs?: boolean;
  /** Porte l'écharpe du Capitaine. */
  capitaine?: boolean;
  /** Bâillonné pour le débat d'aujourd'hui. */
  baillonne?: boolean;
  /** Gracié par le village : ne vote plus jamais. */
  sansVote?: boolean;
  /** Privé de vote pour la journée en cours par le Bouc Émissaire. */
  priveDeVote?: boolean;
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
  /**
   * Chevalier à l'Épée Rouillée : Loup-Garou contaminé par l'épée. Il meurt
   * de la gangrène au début de la nuit suivante. 0 ou absent = personne.
   */
  gangrene?: number;
  /** Bouc Émissaire : joueurs privés de vote, et jour où la privation s'applique. */
  privesDeVote?: number[];
  privesJour?: number;
  /** L'Idiot était Capitaine et a été gracié : l'écharpe est perdue pour de bon. */
  chargePerdue?: boolean;
}

/** Un tour de vote du village. */
export interface TourDeVote {
  /** Joueur désigné par le vote. 0 signifie que le village est à égalité. */
  designe: number;
  /** Après égalité : joueur finalement éliminé, 0 si personne ne l'est. */
  tranche?: number;
}

/**
 * Déroulé de la journée en cours.
 *
 * Le jour n'a pas de secret à garder : chaque mort est publique et prend
 * effet aussitôt. Ce journal ne sert donc pas à différer des actions comme
 * celui de la nuit, mais à retenir où en est le fil — quelles étapes ont
 * été validées, ce qu'a donné le vote — pour que le Maître du Jeu puisse
 * recharger sa page, revenir en arrière, ou lâcher son téléphone deux
 * minutes sans rien perdre.
 */
export interface JourEnCours {
  /** Étapes validées, dans l'ordre. Le fil reprend à la première qui manque. */
  faites?: string[];
  /** Morts de la nuit qui vient de s'achever, à annoncer au village. */
  mortsNuit?: { position: number; cause: string }[];
  /** Survies de la nuit : pour le seul Maître du Jeu, jamais annoncées. */
  sauves?: { position: number; raison: string }[];
  /** Victime infectée par l'Infect Père des Loups. */
  infecte?: number;
  /** L'Enfant Sauvage a rejoint la meute cette nuit. */
  enfantTransforme?: boolean;
  /**
   * Rang de mort atteint au lever du jour. Tout ce qui meurt au-delà est
   * une mort du jour : vote, balle du Chasseur, chagrin d'un Amoureux.
   */
  ordreDepart?: number;
  /** Un tour de vote par entrée. */
  votes?: TourDeVote[];
  /**
   * Décisions touchées mais pas encore appliquées, par identifiant d'étape :
   * successeur du Capitaine, cible du Chasseur, Loup contaminé. On les
   * applique à la validation, jamais au moment du toucher.
   */
  choix?: Record<string, number>;
  /** Juge Bègue : second vote accordé (true) ou refusé (false). */
  secondTour?: boolean;
}

/** Modification du journal du jour. Une valeur `null` efface la clé. */
export type PatchJour = { [K in keyof JourEnCours]?: JourEnCours[K] | null };

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
  /** La Sorcière a annoncé qu'elle empoisonne : l'écran des cibles s'ouvre. */
  poisonVoulu?: boolean;
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
  /** Les trois cartes du Comédien, posées face visible : connues de tous. */
  comedienCartes: string[];
  gagHistory: { night: number; position: number }[];
  hostState: HostState;
  /** Actions de la nuit en cours — visible du seul Maître du Jeu */
  nuit: NuitEnCours;
  /** Déroulé de la journée en cours — visible du seul Maître du Jeu */
  jour: JourEnCours;
  seats: SeatDTO[];
  isHost: boolean;
  mySeats: number[];
  /** L'appareil a au moins une place éliminée : il peut consulter le cimetière. */
  voitLeCimetiere: boolean;
  /** État des seules places portées par cet appareil. */
  mesEtats: EtatPersonnel[];
  /**
   * Code de la partie qui prend la suite, quand le Maître du Jeu a relancé.
   * Chaque téléphone le voit et bascule tout seul : personne n'a de nouveau
   * code à retaper.
   */
  suite: string;
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

/** Plafond d'un village. Au-delà, la partie devient ingérable pour le MJ. */
export const PLACES_MAX = 30;

/** Plancher officiel du jeu : en dessous, les rôles ne s'équilibrent plus. */
export const PLACES_MIN = 7;

/**
 * Les deux temps qui précèdent la distribution.
 *
 * `lobby` : les profils arrivent, chacun saisit son prénom sur son propre
 * téléphone. `composition` : le Maître du Jeu a validé les profils et
 * choisit les cartes. Un retardataire peut encore rejoindre pendant ce
 * second temps — l'effectif se met à jour, le MJ n'a qu'une carte de plus
 * à poser.
 */
export const AVANT_DISTRIBUTION = ["lobby", "composition"];

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

/**
 * L'état d'une place, tel que son porteur a le droit de le voir.
 *
 * La règle est simple : on ne rappelle ici que ce que ce joueur a fait
 * lui-même — ses potions, sa dernière protection, ses envoûtés, son modèle
 * — et ce que le village entier sait déjà. Rien de ce qu'un joueur apprend
 * de la bouche du Maître du Jeu : ni l'identité de son aimé, ni le charme
 * du Flûtiste, ni le passage côté Loups. Ces choses-là se disent d'un
 * regard, la nuit, autour de la table ; le téléphone n'a pas à les
 * doubler.
 */
function etatPersonnel(place: AnyRow, seats: AnyRow[], etat: HostState, game: AnyRow) {
  const position = place["position"] as number;
  const role = (place["role_id"] as string) || "";
  const nuit = (game["night"] as number) ?? 1;
  const prenom = (p: number | undefined) => {
    if (p === undefined) return undefined;
    const cible = seats.find((x) => x["position"] === p);
    if (!cible) return undefined;
    return ((cible["name"] as string) || `Place ${p}`) as string;
  };

  const e: EtatPersonnel = { position };

  if (role === "sorciere") {
    e.potionVie = etat.potionVie !== false;
    e.potionMort = etat.potionMort !== false;
  }
  if (role === "salvateur") {
    const interdit = prenom(etat.protectionPrecedente);
    if (interdit) e.protectionInterdite = interdit;
  }
  if (role === "loup-garou-blanc") e.loupBlancCetteNuit = nuit % 2 === 0;
  if (role === "enfant-sauvage") {
    const modele = prenom(etat.modele);
    if (modele) e.modele = modele;
  }
  if (role === "chien-loup" && etat.chienLoup) e.chienLoup = etat.chienLoup;

  // Le seul secret que l'écran annonce : le passage côté Loups. C'est une
  // consigne de jeu — le converti doit savoir avec qui il gagne — et non un
  // renseignement sur les autres. L'identité de l'aimé, le charme du
  // Flûtiste et la liste des envoûtés restent hors du téléphone : ce sont
  // des choses qui se disent d'un geste, autour de la table.
  if ((etat.devenusLoups ?? []).includes(position)) e.passeCoteLoups = true;
  if (role && (etat.pouvoirsUtilises ?? []).includes(role)) e.pouvoirConsomme = true;
  if (etat.villageSansPouvoirs) e.villageSansPouvoirs = true;

  const statuts = (place["statuses"] ?? []) as string[];
  if (place["is_captain"]) e.capitaine = true;
  if (statuts.includes("baillonne")) e.baillonne = true;
  if (statuts.includes("sans-vote")) e.sansVote = true;
  if (etat.privesJour === nuit && (etat.privesDeVote ?? []).includes(position)) {
    e.priveDeVote = true;
  }

  return e;
}

/**
 * Renumérote les places de 1 à N, sans trou.
 *
 * Le Renard et le Montreur d'Ours raisonnent sur les voisins : une place
 * manquante au milieu de la liste fausserait leurs pouvoirs. Comme le salon
 * permet maintenant de retirer quelqu'un, il faut refermer le rang derrière
 * lui.
 */
async function renumeroter(db: Base, gameId: string) {
  const seats = await seatsDe(db, gameId);
  let rang = 0;
  for (const s of seats) {
    rang += 1;
    if (s["position"] !== rang) await db.pb.modifier("seats", s["id"], { position: rang });
  }
  await db.pb.modifier("games", gameId, { player_count: rang });
  return rang;
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
  // Le cimetière n'est ouvert qu'à un téléphone qui ne porte qu'un seul
  // joueur, et seulement une fois celui-ci éliminé : un appareil partagé à
  // deux ou trois y donnerait les cartes des morts à des vivants.
  const mesPlaces = seats.filter((s) => s["device_token"] && s["device_token"] === token);
  const voitLeCimetiere = isHost || (mesPlaces.length === 1 && !mesPlaces[0]?.["alive"]);
  const finie = game["status"] === "ended";

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
    comedienCartes: (game["comedien_cartes"] ?? []) as string[],
    centerCards:
      isHost || seats.some((s) => s["role_id"] === "voleur" && s["device_token"] === token)
        ? ((game["center_cards"] ?? []) as string[])
        : [],
    gagHistory: (game["gag_history"] ?? []) as { night: number; position: number }[],
    hostState: isHost ? ((game["host_state"] ?? {}) as HostState) : {},
    nuit: isHost ? ((game["nuit"] ?? {}) as NuitEnCours) : {},
    jour: isHost ? ((game["jour"] ?? {}) as JourEnCours) : {},
    isHost,
    mySeats,
    voitLeCimetiere,
    suite: (game["suite"] as string) || "",
    mesEtats: seats
      .filter((s) => s["device_token"] && s["device_token"] === token)
      .map((s) => etatPersonnel(s, seats, (game["host_state"] ?? {}) as HostState, game)),
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
      // Partie terminée : toutes les cartes se retournent, comme on les
      // étale sur la table quand la dernière est tombée.
      const visible =
        isHost || mine || s["public_role"] || finie || (voitLeCimetiere && !s["alive"]);
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
        deathOrder: isHost ? ((s["death_order"] as number) ?? 0) : 0,
        isCaptain: !!s["is_captain"],
        // Les Amoureux ne se connaissent qu'entre eux : envoyer le lien à
        // toute la table le donnait à qui savait ouvrir la console de son
        // navigateur. Même chose pour la carte emportée par la Servante.
        loverGroup: isHost || mine ? (s["lover_group"] as number) || null : null,
        statuses:
          isHost || mine
            ? ((s["statuses"] ?? []) as string[])
            : ((s["statuses"] ?? []) as string[]).filter(
                (x) => x === "baillonne" || x === "sans-vote",
              ),
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

/** Tire un code à quatre lettres qui n'est pas déjà pris. */
async function codeLibre(db: Base) {
  let code = makeCode();
  for (let essai = 0; essai < 8; essai++) {
    const existant = await db.pb.premier("games", `code = ${db.litteral(code)}`);
    if (!existant) break;
    code = makeCode();
  }
  return code;
}

export const createGame = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      hostToken: string;
      playerCount: number;
      selection: Record<string, number>;
      thiefVariant?: "centre" | "echange";
      singleDevice?: boolean;
      comedienCartes?: string[];
    }) => d,
  )
  .handler(async ({ data }) => {
    const db = await base();
    const single = !!data.singleDevice;
    // En multi-téléphones, l'effectif n'est plus décidé ici : il se déduit
    // des joueurs qui se connectent. Le nombre saisi à la création n'a servi
    // qu'à préparer une composition de départ.
    const count = single ? Math.max(3, Math.min(PLACES_MAX, Math.floor(data.playerCount))) : 0;

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

    const code = await codeLibre(db);

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
      comedien_cartes: (data.comedienCartes ?? []).slice(0, 3),
      single_device: single,
      host_state: {
        potionVie: true,
        potionMort: true,
        charmed: [],
        lastUsed: {},
        devenusLoups: [],
      },
      nuit: {},
      jour: {},
    });

    // Mode « un seul téléphone » : toutes les places existent d'emblée et
    // sont portées par l'appareil du MJ. En multi-téléphones, aucune place
    // n'est créée — chaque joueur apporte la sienne en rejoignant.
    for (let i = 0; i < count; i++) {
      await db.pb.creer("seats", {
        game_id: game["id"],
        position: i + 1,
        name: "",
        alive: true,
        statuses: [],
        device_token: data.hostToken,
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

/**
 * Un appareil prend place dans le village.
 *
 * Il n'y a plus de places vides à réclamer : le salon part vide et chaque
 * téléphone apporte la ou les siennes. C'est ce qui permet au Maître du Jeu
 * de ne plus annoncer l'effectif à l'avance — il le lit sur son écran au
 * fur et à mesure que le village arrive.
 */
export const claimSeats = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; count: number }) => d)
  .handler(async ({ data }) => {
    const db = await base();
    const game = await loadGame(db, data.code);
    if (!AVANT_DISTRIBUTION.includes(game["status"] as string)) {
      throw new Error("Les cartes sont déjà distribuées");
    }
    if (game["single_device"]) throw new Error("Cette partie se joue sur un seul téléphone");

    // Trois places maximum par appareil : au-delà, le téléphone circule trop
    // dans la même main et le secret des cartes ne tient plus. On refuse la
    // demande au lieu de la rogner en silence.
    const demande = Math.floor(data.count);
    if (!Number.isFinite(demande) || demande < 1 || demande > PLACES_MAX_PAR_APPAREIL) {
      throw new Error(`Un téléphone porte au maximum ${PLACES_MAX_PAR_APPAREIL} joueurs`);
    }

    const seats = await seatsDe(db, game["id"]);
    const siennes = seats.filter((s) => s["device_token"] === data.token);
    const manque = demande - siennes.length;

    if (manque > 0) {
      if (seats.length + manque > PLACES_MAX) {
        throw new Error(`Le village est complet (${PLACES_MAX} places)`);
      }
      for (let i = 0; i < manque; i++) {
        await db.pb.creer("seats", {
          game_id: game["id"],
          position: seats.length + i + 1,
          name: "",
          alive: true,
          statuses: [],
          device_token: data.token,
        });
      }
      await db.pb.modifier("games", game["id"], { player_count: seats.length + manque });
    } else if (manque < 0) {
      for (const s of siennes.slice(demande)) await db.pb.supprimer("seats", s["id"]);
      await renumeroter(db, game["id"]);
    }

    const fresh = await loadGame(db, data.code);
    return buildDTO(db, fresh, data.token);
  });

/**
 * Le MJ ajoute une place.
 *
 * Réservé au mode un seul téléphone, où c'est lui qui compte la tablée :
 * en multi-téléphones, chaque joueur apporte sa place lui-même et le MJ
 * n'inscrit personne.
 */
export const addSeat = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string }) => d)
  .handler(async ({ data }) => {
    const db = await base();
    const game = await requireHost(db, data.code, data.token);
    if (!AVANT_DISTRIBUTION.includes(game["status"] as string)) {
      throw new Error("Les cartes sont déjà distribuées");
    }
    if (!game["single_device"]) {
      throw new Error("Chaque joueur prend sa place depuis son propre téléphone");
    }
    const seats = await seatsDe(db, game["id"]);
    if (seats.length >= PLACES_MAX)
      throw new Error(`Le village est complet (${PLACES_MAX} places)`);
    await db.pb.creer("seats", {
      game_id: game["id"],
      position: seats.length + 1,
      name: "",
      alive: true,
      statuses: [],
      device_token: game["host_token"],
    });
    await db.pb.modifier("games", game["id"], { player_count: seats.length + 1 });
    const fresh = await loadGame(db, data.code);
    return buildDTO(db, fresh, data.token);
  });

/**
 * Le MJ clôt l'appel et passe au choix des cartes — ou revient en arrière.
 *
 * Les profils restent modifiables et un retardataire peut encore arriver :
 * cette étape n'enferme rien, elle range simplement l'écran du MJ.
 */
export const validerProfils = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; valide: boolean }) => d)
  .handler(async ({ data }) => {
    const db = await base();
    const game = await requireHost(db, data.code, data.token);
    if (!AVANT_DISTRIBUTION.includes(game["status"] as string)) {
      throw new Error("Les cartes sont déjà distribuées");
    }
    const seats = await seatsDe(db, game["id"]);
    if (data.valide && seats.length < PLACES_MIN) {
      throw new Error(`Il faut au moins ${PLACES_MIN} joueurs`);
    }
    await db.pb.modifier("games", game["id"], {
      status: data.valide ? "composition" : "lobby",
      player_count: seats.length,
    });
    const fresh = await loadGame(db, data.code);
    return buildDTO(db, fresh, data.token);
  });

/**
 * Le MJ rend son profil à un joueur.
 *
 * Quelqu'un s'est trompé de prénom, ou deux personnes se sont emmêlées : le
 * MJ efface le prénom et la place repart vide, sur le téléphone de son
 * propriétaire, qui la remplit de nouveau. Rien n'est supprimé — la place
 * reste, le téléphone garde la sienne.
 */
export const libererProfil = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; position: number }) => d)
  .handler(async ({ data }) => {
    const db = await base();
    const game = await requireHost(db, data.code, data.token);
    if (!AVANT_DISTRIBUTION.includes(game["status"] as string)) {
      throw new Error("Les cartes sont déjà distribuées");
    }
    const seats = await seatsDe(db, game["id"]);
    const cible = seats.find((s) => s["position"] === data.position);
    if (cible) await db.pb.modifier("seats", cible["id"], { name: "" });
    const fresh = await loadGame(db, data.code);
    return buildDTO(db, fresh, data.token);
  });

/** Le MJ retire une place du salon : quelqu'un s'en va, ou s'est connecté deux fois. */
export const removeSeat = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; position: number }) => d)
  .handler(async ({ data }) => {
    const db = await base();
    const game = await requireHost(db, data.code, data.token);
    if (!AVANT_DISTRIBUTION.includes(game["status"] as string)) {
      throw new Error("Les cartes sont déjà distribuées");
    }
    const seats = await seatsDe(db, game["id"]);
    const cible = seats.find((s) => s["position"] === data.position);
    if (cible) {
      // On ne supprime jamais quelqu'un qui a validé son profil : le MJ
      // libère d'abord la place, son propriétaire décide ensuite.
      if (((cible["name"] as string) || "").trim() && !game["single_device"]) {
        throw new Error("Libérez d'abord ce profil : son prénom est validé");
      }
      await db.pb.supprimer("seats", cible["id"]);
      await renumeroter(db, game["id"]);
    }
    const fresh = await loadGame(db, data.code);
    return buildDTO(db, fresh, data.token);
  });

/** Le MJ retouche la composition depuis le salon, une fois l'effectif connu. */
export const setSelection = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; selection: Record<string, number> }) => d)
  .handler(async ({ data }) => {
    const db = await base();
    const game = await requireHost(db, data.code, data.token);
    if (!AVANT_DISTRIBUTION.includes(game["status"] as string)) {
      throw new Error("Les cartes sont déjà distribuées");
    }
    await db.pb.modifier("games", game["id"], { selection: data.selection });
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
    const nom = data.name.trim().slice(0, 24);
    if (!nom) throw new Error("Entrez un prénom");
    if (!cible) throw new Error("Place introuvable");
    // Le MJ nomme n'importe quelle place — c'est lui qui tient le tour de
    // table en mode un seul téléphone. Un joueur ne nomme que les siennes, et
    // une seule fois : pour corriger, il demande au MJ de libérer son profil.
    if (!isHost) {
      if (cible["device_token"] !== data.token) throw new Error("Cette place n'est pas la vôtre");
      if ((cible["name"] as string) || "") throw new Error("Ce profil est déjà validé");
    }
    await db.pb.modifier("seats", cible["id"], { name: nom });
    const fresh = await loadGame(db, data.code);
    return buildDTO(db, fresh, data.token);
  });

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
    if (count < PLACES_MIN) throw new Error(`Il faut au moins ${PLACES_MIN} joueurs`);
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
    const seats = await seatsDe(db, game["id"]);
    if (data.phase === "nuit") {
      // le bâillon tombe quand une nouvelle nuit commence
      for (const s of seats) {
        const avant = (s["statuses"] ?? []) as string[];
        if (avant.includes("baillonne")) {
          await db.pb.modifier("seats", s["id"], {
            statuses: avant.filter((x) => x !== "baillonne"),
          });
        }
      }
      // Le fil de la journée ne vaut que pour la journée écoulée, et celui
      // de la nuit précédente encore moins : garder son curseur ferait
      // reprendre la nuit suivante au milieu, avec des désignations vides.
      patch["jour"] = {};
      patch["nuit"] = {};
    } else {
      // Passage au jour sans résolution de nuit (rattrapage manuel) : on
      // ouvre quand même un fil, sinon le moteur de jour n'a pas de repère
      // pour distinguer les morts déjà tombées de celles du vote à venir.
      patch["jour"] = {
        faites: [],
        mortsNuit: [],
        ordreDepart: Math.max(0, ...seats.map((s) => (s["death_order"] as number) ?? 0)),
      };
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
 * Le MJ avance dans le fil de la journée.
 *
 * Contrairement à la nuit, rien n'est différé : les morts du jour sont
 * appliquées sur-le-champ par `setDead`. Ce journal ne retient que le
 * chemin parcouru.
 */
export const setDayAction = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; patch: PatchJour }) => d)
  .handler(async ({ data }) => {
    const db = await base();
    const game = await requireHost(db, data.code, data.token);
    const courant = (game["jour"] ?? {}) as JourEnCours;
    const fusion = { ...courant, ...data.patch } as JourEnCours;
    for (const [cle, valeur] of Object.entries(data.patch)) {
      if (valeur === null) delete (fusion as Record<string, unknown>)[cle];
    }
    await db.pb.modifier("games", game["id"], { jour: fusion });
    const fresh = await loadGame(db, data.code);
    return buildDTO(db, fresh, data.token);
  });

/**
 * Servante Dévouée : elle prend la carte d'un joueur éliminé.
 *
 * Juste avant que la carte du mort ne soit retournée, elle peut se dévoiler
 * et s'en emparer sans la montrer à personne. Ce n'est pas un échange : sa
 * propre carte est perdue et l'éliminé ne reçoit rien. Elle repart de zéro
 * avec le nouveau rôle — d'où la remise à neuf des compteurs qui suivaient
 * les pouvoirs de ce rôle, et le `seen` remis à faux pour qu'elle découvre
 * sa nouvelle carte sur son téléphone.
 */
export const servanteEchange = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string; servante: number; morte: number }) => d)
  .handler(async ({ data }) => {
    const db = await base();
    const game = await requireHost(db, data.code, data.token);
    const seats = await seatsDe(db, game["id"]);
    const servante = seats.find((s) => s["position"] === data.servante);
    const morte = seats.find((s) => s["position"] === data.morte);
    if (!servante || !morte) throw new Error("Joueur introuvable");
    if (servante["id"] === morte["id"]) {
      throw new Error("La Servante ne peut pas reprendre sa propre carte");
    }
    if (!servante["alive"]) throw new Error("La Servante Dévouée est éliminée");

    const nouveau = (morte["role_id"] as string) || "";
    await db.pb.modifier("seats", servante["id"], {
      role_id: nouveau,
      seen: false,
      public_role: false,
    });
    // La carte du mort part avec elle : elle ne sera jamais retournée.
    const statuts = ((morte["statuses"] ?? []) as string[]).filter((x) => x !== "carte-prise");
    await db.pb.modifier("seats", morte["id"], {
      statuses: [...statuts, "carte-prise"],
      public_role: false,
    });

    const etat = (game["host_state"] ?? {}) as HostState;
    const patch: HostState = {
      ...etat,
      pouvoirsUtilises: [
        ...(etat.pouvoirsUtilises ?? []).filter((x) => x !== nouveau),
        "servante-devouee",
      ],
    };
    if (nouveau === "sorciere") {
      patch.potionVie = true;
      patch.potionMort = true;
    }
    if (nouveau === "infect-pere-des-loups") patch.infectionUtilisee = false;
    if (nouveau === "ancien") patch.ancienDejaAttaque = false;
    await db.pb.modifier("games", game["id"], { host_state: patch });

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

    // Chevalier à l'Épée Rouillée : le Loup contaminé la veille meurt de la
    // gangrène au cours de cette nuit. Ni protection ni potion n'y peuvent
    // quoi que ce soit — c'est une maladie, pas une attaque.
    if (etat.gangrene) {
      const malade = parPosition(etat.gangrene);
      if (malade && malade["alive"]) morts.push({ position: etat.gangrene, cause: "gangrene" });
      patchEtat.gangrene = 0;
    }

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

    // Le bilan de la nuit ouvre le fil de la journée. Il est écrit en base
    // plutôt que renvoyé au seul écran du moment : le Maître du Jeu peut
    // recharger sa page en plein milieu des annonces sans rien perdre.
    const mortsUniques = morts.filter(
      (m, i, t) => t.findIndex((x) => x.position === m.position) === i,
    );
    const journalDuJour: JourEnCours = {
      faites: [],
      mortsNuit: mortsUniques,
      sauves,
      enfantTransforme,
      ordreDepart: ordre,
    };
    if (infecte !== undefined) journalDuJour.infecte = infecte;

    await db.pb.modifier("games", game["id"], {
      host_state: { ...etat, ...patchEtat },
      nuit: {},
      jour: journalDuJour,
      phase: "jour",
    });

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

/**
 * Terminer la partie — et rouvrir aussitôt la suivante.
 *
 * À la fin d'une partie, tout le monde est encore autour de la table. Faire
 * retaper un code à quinze personnes casserait l'élan pour rien : la partie
 * suivante s'ouvre donc toute seule, avec les mêmes places, les mêmes
 * prénoms et les mêmes téléphones. Les cartes sont rebattues et se
 * rechoisissent, le Maître du Jeu reste celui qui l'était — pour en
 * changer, on se passe le téléphone, d'où les prénoms qui redeviennent
 * modifiables.
 *
 * Le nouveau code est tiré tout seul. L'ancienne partie garde une flèche
 * vers lui : chaque appareil la suit au rafraîchissement suivant, sans que
 * personne ait rien à saisir.
 */
export const endGame = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; token: string }) => d)
  .handler(async ({ data }) => {
    const db = await base();
    const ancienne = await requireHost(db, data.code, data.token);
    if (ancienne["suite"]) {
      // Déjà terminée : on renvoie la partie qui a pris la suite plutôt que
      // d'en ouvrir une troisième si le MJ touche deux fois le bouton.
      const suite = await loadGame(db, ancienne["suite"] as string);
      return buildDTO(db, suite, data.token);
    }

    const places = await seatsDe(db, ancienne["id"]);
    const code = await codeLibre(db);
    const nouvelle = await db.pb.creer("games", {
      code,
      host_token: ancienne["host_token"],
      status: "lobby",
      phase: "nuit",
      night: 1,
      player_count: places.length,
      single_device: ancienne["single_device"],
      thief_variant: ancienne["thief_variant"],
      selection: ancienne["selection"],
      comedien_cartes: ancienne["comedien_cartes"] ?? [],
      center_cards: [],
      gag_history: [],
      host_state: {},
      nuit: {},
      jour: {},
    });

    // Les places suivent : même rang, même prénom, même téléphone. Tout le
    // reste — carte, vie, statuts, écharpe, amours — repart de zéro.
    for (const place of places) {
      await db.pb.creer("seats", {
        game_id: nouvelle["id"],
        position: place["position"],
        name: place["name"] ?? "",
        alive: true,
        statuses: [],
        ...(place["device_token"] ? { device_token: place["device_token"] } : {}),
      });
    }

    await db.pb.modifier("games", ancienne["id"], { status: "ended", suite: code });
    const fresh = await loadGame(db, code);
    return buildDTO(db, fresh, data.token);
  });
