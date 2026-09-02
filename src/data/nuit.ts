/**
 * Conduite de la nuit.
 *
 * Pour chaque rôle appelé, ce fichier décrit ce que le Maître du Jeu dit à
 * voix haute et ce qu'il fait sur son écran. L'ordre d'appel lui-même vient
 * de `wakeOrder` dans roles.ts ; ici on ne décrit que le contenu de l'étape.
 *
 * Principe retenu : le Maître du Jeu manipule tout, comme avec des cartes
 * physiques. Le téléphone d'un joueur ne sert qu'à découvrir sa carte et à
 * recevoir les informations qui lui sont destinées.
 */

/** Ce que l'écran propose de faire pendant l'étape. */
export type TypeAction =
  /** Rien à saisir : on lit, on agit hors écran, on passe. */
  | "aucune"
  /** Désigner un joueur, enregistré sous la clé indiquée. */
  | "cible"
  /** Désigner deux joueurs (Cupidon). */
  | "couple"
  /** Désigner un joueur puis lui montrer une carte (Voyante, Chaman). */
  | "revelation"
  /** La meute désigne sa victime. */
  | "loups"
  /** Potion de vie et potion de mort. */
  | "sorciere"
  /** Le Voleur prend la carte d'un joueur. */
  | "voleur"
  /** Envoûter jusqu'à deux joueurs. */
  | "flute"
  /** Bâillonner un joueur pour le débat du lendemain. */
  | "baillon";

export interface EtapeNuit {
  /** Phrase à lire à voix haute pour réveiller le rôle. */
  appel: string;
  /** Ce que le Maître du Jeu fait pendant que le rôle est éveillé. */
  consigne: string;
  action: TypeAction;
  /** Clé sous laquelle la cible est enregistrée dans la nuit en cours. */
  cle?: string;
}

const RENDORMIR = " Puis : « Rendors-toi. »";

export const ETAPES: Record<string, EtapeNuit> = {
  voleur: {
    appel: "« Le Voleur se réveille. »",
    consigne:
      "Montrez-lui discrètement les cartes disponibles, puis enregistrez son choix ci-dessous. Sa carte et celle de sa victime sont échangées : les deux joueurs devront revoir leur carte au lever du jour." +
      RENDORMIR,
    action: "voleur",
  },
  cupidon: {
    appel: "« Cupidon se réveille et désigne les deux Amoureux. »",
    consigne: "Il peut se choisir lui-même. Touchez les deux joueurs qu'il désigne." + RENDORMIR,
    action: "couple",
  },
  amoureux: {
    appel: "« Les Amoureux se réveillent et se reconnaissent. »",
    consigne:
      "Laissez-leur trois secondes pour se regarder, en silence. Rappelez-leur d'un geste qu'ils mourront ensemble." +
      RENDORMIR,
    action: "aucune",
  },
  "enfant-sauvage": {
    appel: "« L'Enfant Sauvage se réveille et choisit son modèle. »",
    consigne:
      "Enregistrez le modèle : si ce joueur meurt, l'Enfant Sauvage rejoint les Loups-Garous." +
      RENDORMIR,
    action: "cible",
    cle: "modele",
  },
  "chien-loup": {
    appel: "« Le Chien-Loup se réveille et choisit son camp. »",
    consigne:
      "Il indique d'un signe s'il joue Villageois ou Loup-Garou. Choix définitif et secret : notez-le, personne d'autre ne doit le savoir." +
      RENDORMIR,
    action: "aucune",
  },
  soeurs: {
    appel: "« Les Deux Sœurs se réveillent et se reconnaissent. »",
    consigne: "Trois secondes, en silence, sans un mot." + RENDORMIR,
    action: "aucune",
  },
  freres: {
    appel: "« Les Trois Frères se réveillent et se reconnaissent. »",
    consigne: "Trois secondes, en silence, sans un mot." + RENDORMIR,
    action: "aucune",
  },
  salvateur: {
    appel: "« Le Salvateur se réveille et désigne qui il protège cette nuit. »",
    consigne:
      "Il peut se protéger lui-même, mais jamais la même personne deux nuits de suite. La protection arrête les Loups-Garous, pas le poison de la Sorcière." +
      RENDORMIR,
    action: "cible",
    cle: "protection",
  },
  comedien: {
    appel: "« Le Comédien se réveille et choisit une carte au centre. »",
    consigne:
      "Il joue ce pouvoir pour cette nuit et la journée qui suit. Retirez ensuite la carte du jeu." +
      RENDORMIR,
    action: "aucune",
  },
  voyante: {
    appel: "« La Voyante se réveille et désigne un joueur. »",
    consigne:
      "Choisissez d'abord la Voyante, puis le joueur qu'elle sonde : la carte s'affiche sur son téléphone. Si elle n'en a pas, montrez-lui votre écran à l'abri des regards." +
      RENDORMIR,
    action: "revelation",
  },
  renard: {
    appel: "« Le Renard se réveille et désigne un joueur. »",
    consigne:
      "Répondez par oui ou non d'un signe de tête : y a-t-il au moins un Loup-Garou parmi ce joueur et ses deux voisins ? Si la réponse est non, il perd son pouvoir pour le reste de la partie." +
      RENDORMIR,
    action: "cible",
    cle: "renard",
  },
  chaman: {
    appel: "« Le Chaman se réveille. »",
    consigne:
      "Il pose une question sur un rôle présent ou absent de la partie. Répondez par oui ou non." +
      RENDORMIR,
    action: "aucune",
  },
  "loup-garou": {
    appel: "« Les Loups-Garous se réveillent, se reconnaissent et désignent leur victime. »",
    consigne:
      "Laissez-leur le temps de se mettre d'accord en silence. Enregistrez la victime : elle ne mourra qu'au lever du jour, une fois la Sorcière passée." +
      RENDORMIR,
    action: "loups",
  },
  "loup-garou-blanc": {
    appel: "« Le Loup-Garou Blanc se réveille seul et peut dévorer un Loup-Garou. »",
    consigne:
      "Une nuit sur deux seulement. Il vient de dévorer avec la meute ; il peut maintenant éliminer l'un de ses congénères." +
      RENDORMIR,
    action: "cible",
    cle: "loupBlanc",
  },
  "infect-pere-des-loups": {
    appel: "« L'Infect Père des Loups peut infecter la victime. »",
    consigne:
      "Une seule fois dans la partie. S'il infecte : la victime survit, garde son pouvoir, et rejoint secrètement les Loups-Garous. Prévenez-la discrètement au lever du jour." +
      RENDORMIR,
    action: "aucune",
  },
  "grand-mechant-loup": {
    appel: "« Le Grand Méchant Loup se réveille et dévore une seconde victime. »",
    consigne:
      "Uniquement tant qu'aucun Loup-Garou n'est mort. Si un Loup est déjà tombé, ne l'appelez pas du tout." +
      RENDORMIR,
    action: "cible",
    cle: "secondeVictime",
  },
  "loup-feral": {
    appel: "« Le Loup Féral se réveille. »",
    consigne:
      "Une fois par partie, il désigne un joueur qui devient Loup Féral à son tour, à l'insu des autres Loups-Garous." +
      RENDORMIR,
    action: "aucune",
  },
  "loup-shaman": {
    appel: "« Le Loup Chamane se réveille et désigne un joueur. »",
    consigne: "Le pouvoir de ce joueur est inactif pour le tour à venir." + RENDORMIR,
    action: "cible",
    cle: "pouvoirNeutralise",
  },
  ombre: {
    appel: "« L'Ombre se réveille et se glisse derrière un joueur. »",
    consigne:
      "Si l'Ombre est attaquée cette nuit, l'attaque frappe son hôte à sa place." + RENDORMIR,
    action: "cible",
    cle: "ombre",
  },
  sorciere: {
    appel: "« La Sorcière se réveille. »",
    consigne:
      "Montrez-lui la victime des Loups-Garous. Elle peut la sauver, empoisonner quelqu'un, faire les deux, ou ne rien faire. Chaque potion ne sert qu'une fois dans la partie." +
      RENDORMIR,
    action: "sorciere",
  },
  corbeau: {
    appel: "« Le Corbeau se réveille et désigne un joueur. »",
    consigne: "Ce joueur commencera le vote de demain avec deux voix contre lui." + RENDORMIR,
    action: "cible",
    cle: "corbeau",
  },
  pyromane: {
    appel: "« Le Pyromane se réveille. »",
    consigne:
      "Il asperge un ou plusieurs joueurs. Une fois dans la partie, il peut enflammer : tous les joueurs aspergés meurent d'un coup." +
      RENDORMIR,
    action: "aucune",
  },
  assassin: {
    appel: "« L'Assassin se réveille. »",
    consigne: "Une fois dans la partie, il peut poignarder un joueur." + RENDORMIR,
    action: "cible",
    cle: "assassin",
  },
  gitane: {
    appel: "« La Gitane ouvre la séance de spiritisme. »",
    consigne:
      "Elle désigne un joueur mort, qui répond par oui ou par non à une question posée." +
      RENDORMIR,
    action: "aucune",
  },
  "joueur-de-flute": {
    appel: "« Le Joueur de Flûte se réveille et envoûte deux joueurs. »",
    consigne:
      "Il gagne seul dès que tous les survivants sont envoûtés. Réveillez ensuite les envoûtés pour qu'ils se reconnaissent, sans savoir qui les a charmés." +
      RENDORMIR,
    action: "flute",
  },
  gargouille: {
    appel: "« La Gargouille se réveille et pétrifie un joueur. »",
    consigne: "Ce joueur ne pourra ni parler ni voter demain." + RENDORMIR,
    action: "cible",
    cle: "petrifie",
  },
  "garde-champetre": {
    appel: "« Le Garde Champêtre se réveille et désigne un joueur à bâillonner. »",
    consigne:
      "Le joueur désigné ne parlera pas pendant le débat de demain, mais il votera et peut communiquer par gestes. Une même cible n'est de nouveau visable qu'après trois nuits." +
      RENDORMIR,
    action: "baillon",
  },
};

/** Phrase d'ouverture et de clôture de la nuit. */
export const OUVERTURE =
  "« La nuit tombe sur le village. Tout le monde ferme les yeux et s'endort. »";
export const CLOTURE = "« Le village se réveille. »";
