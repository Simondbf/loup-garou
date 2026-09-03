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
  | "baillon"
  /** Le Chien-Loup choisit son camp, une fois pour toutes. */
  | "chienLoup";

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
      "Montrez-lui discrètement les cartes disponibles, puis enregistrez son choix ci-dessous. Dans la variante officielle (deux cartes au centre), s'il tombe sur deux Loups-Garous il est OBLIGÉ d'en prendre un. En vol de rôle, sa carte et celle de sa victime sont échangées : les deux devront revoir leur carte au lever du jour." +
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
      "Il indique d'un signe s'il joue Villageois ou Loup-Garou. Choix définitif et secret : enregistrez-le ci-dessous, personne d'autre ne doit le savoir. S'il choisit les Loups, il se réveillera avec eux dès cette nuit." +
      RENDORMIR,
    action: "chienLoup",
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
      "Il peut se protéger lui-même, mais jamais la même personne deux nuits de suite. Sa protection arrête les Loups-Garous mais reste sans effet contre le poison de la Sorcière, le charme du Joueur de Flûte, l'infection de l'Infect Père — et elle ne donne aucun résultat sur la Petite Fille." +
      RENDORMIR,
    action: "cible",
    cle: "protection",
  },
  comedien: {
    appel: "« Le Comédien se réveille et choisit une carte au centre. »",
    consigne:
      "Il choisit parmi les trois cartes de villageois que vous avez posées au centre avant la partie — ce ne sont pas les cartes des joueurs, personne n'est dépossédé de son pouvoir. Il joue ce pouvoir pour cette nuit et la journée qui suit, puis retirez la carte du jeu." +
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
      "Il désigne le joueur central d'un groupe de trois voisins ENCORE EN JEU ; les éliminés ne comptent pas. Répondez oui ou non d'un signe : y a-t-il au moins un Loup-Garou parmi les trois ? Si non, il perd définitivement son pouvoir. Il n'est jamais obligé de flairer." +
      RENDORMIR,
    action: "cible",
    cle: "renard",
  },
  "loup-garou": {
    appel: "« Les Loups-Garous se réveillent, se reconnaissent et désignent leur victime. »",
    consigne:
      "Laissez-leur le temps de se mettre d'accord en silence. Enregistrez la victime : elle ne mourra qu'au lever du jour, une fois la Sorcière passée. Si la Petite Fille se fait surprendre en train d'espionner, elle peut être dévorée à la place de la victime désignée." +
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
      "Une seule fois dans la partie. S'il infecte : la victime survit, garde son pouvoir et rejoint secrètement les Loups-Garous — touchez-la discrètement. Ni le Salvateur ni la Sorcière n'empêchent l'infection, mais l'Ancien y résiste à sa première morsure." +
      RENDORMIR,
    action: "aucune",
  },
  "grand-mechant-loup": {
    appel: "« Le Grand Méchant Loup se réveille et dévore une seconde victime. »",
    consigne:
      "Uniquement tant qu'aucun Loup-Garou, Enfant Sauvage ou Chien-Loup n'a été éliminé. Sa seconde victime ne peut pas être un Loup-Garou." +
      RENDORMIR,
    action: "cible",
    cle: "secondeVictime",
  },
  sorciere: {
    appel: "« La Sorcière se réveille. »",
    consigne:
      "Montrez-lui la victime des Loups-Garous. Elle peut la sauver, empoisonner quelqu'un, faire les deux, ou ne rien faire. Chaque potion ne sert qu'une fois dans la partie." +
      RENDORMIR,
    action: "sorciere",
  },
  pyromane: {
    appel: "« Le Pyromane se réveille. »",
    consigne:
      "Il asperge d'essence un ou plusieurs joueurs, que vous marquez de la tuile Feu. Une fois dans la partie, il peut enflammer : tous les joueurs aspergés meurent d'un coup. Ce personnage se joue avec les bâtiments." +
      RENDORMIR,
    action: "aucune",
  },
  corbeau: {
    appel: "« Le Corbeau se réveille et désigne un joueur. »",
    consigne: "Ce joueur commencera le vote de demain avec deux voix contre lui." + RENDORMIR,
    action: "cible",
    cle: "corbeau",
  },
  "joueur-de-flute": {
    appel: "« Le Joueur de Flûte se réveille et envoûte deux joueurs. »",
    consigne:
      "Deux NOUVEAUX joueurs chaque nuit ; il ne peut pas s'auto-charmer. Réveillez ensuite tous les envoûtés, anciens et nouveaux, pour qu'ils se reconnaissent. Ni le Salvateur ni la Sorcière ne protègent du charme, et les Loups-Garous n'y sont pas immunisés. Il gagne seul dès qu'il ne reste que des envoûtés." +
      RENDORMIR,
    action: "flute",
  },
  magicien: {
    appel: "« Le Magicien se réveille et désigne un habitant à faire taire. »",
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
