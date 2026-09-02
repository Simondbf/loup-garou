export type Camp = "villageois" | "loups" | "solitaire" | "special";

export interface Role {
  id: string;
  name: string;
  camp: Camp;
  /** Nombre max d'exemplaires conseillé (0 = illimité) */
  max: number;
  /** Ordre de réveil pendant la nuit (plus petit = plus tôt) */
  wakeOrder?: number;
  /** Statut découlant d'un autre rôle (Amoureux, Capitaine) : ne se distribue pas. */
  derived?: boolean;
  short: string;
  description: string;
  emoji: string;
}

export const CAMP_LABEL: Record<Camp, string> = {
  villageois: "Village",
  loups: "Loups-Garous",
  solitaire: "Solitaire",
  special: "Camp inconnu",
};

export const ROLES: Role[] = [
  // ---------------- BASE ----------------
  {
    id: "loup-garou",
    name: "Loup-Garou",
    camp: "loups",
    max: 0,
    wakeOrder: 30,
    emoji: "🐺",
    short: "Dévore un villageois chaque nuit.",
    description:
      "Chaque nuit, les Loups-Garous se réveillent, se reconnaissent et désignent ensemble une victime à dévorer. Le jour, ils se fondent dans la foule et votent avec les autres. Ils gagnent quand il ne reste plus aucun villageois vivant.",
  },
  {
    id: "simple-villageois",
    name: "Simple Villageois",
    camp: "villageois",
    max: 0,
    emoji: "🧑‍🌾",
    short: "Aucun pouvoir, juste sa parole et son vote.",
    description:
      "Le Simple Villageois n'a aucun pouvoir particulier. Sa seule arme est son intuition, sa capacité de persuasion et son vote pendant le jour. Il gagne quand tous les Loups-Garous sont éliminés.",
  },
  {
    id: "voyante",
    name: "Voyante",
    camp: "villageois",
    max: 1,
    wakeOrder: 20,
    emoji: "🔮",
    short: "Découvre chaque nuit la carte d'un joueur.",
    description:
      "Chaque nuit, la Voyante désigne un joueur : le Maître du Jeu lui montre discrètement sa carte. Elle sait donc la vérité, mais doit la distiller sans se faire repérer par les Loups-Garous.",
  },
  {
    id: "sorciere",
    name: "Sorcière",
    camp: "villageois",
    max: 1,
    wakeOrder: 40,
    emoji: "🧪",
    short: "Une potion de vie, une potion de mort.",
    description:
      "La Sorcière possède deux potions, utilisables une seule fois chacune sur la partie : la potion de guérison, qui ressuscite la victime des Loups-Garous, et la potion d'empoisonnement, qui tue instantanément un joueur de son choix. Elle peut utiliser les deux la même nuit.",
  },
  {
    id: "chasseur",
    name: "Chasseur",
    camp: "villageois",
    max: 1,
    emoji: "🎯",
    short: "En mourant, il abat un joueur de son choix.",
    description:
      "Quand le Chasseur meurt — dévoré, exécuté ou empoisonné — il tire immédiatement une dernière balle et élimine le joueur de son choix. Sa vengeance est obligatoire.",
  },
  {
    id: "cupidon",
    name: "Cupidon",
    camp: "villageois",
    max: 1,
    wakeOrder: 10,
    emoji: "💘",
    short: "Désigne deux amoureux la première nuit.",
    description:
      "La première nuit, Cupidon désigne deux joueurs (éventuellement lui-même) qui deviennent Amoureux. Si l'un meurt, l'autre meurt de chagrin. Si les Amoureux sont dans des camps opposés, ils forment un troisième camp et doivent être les deux derniers survivants.",
  },
  {
    id: "petite-fille",
    name: "Petite Fille",
    camp: "villageois",
    max: 1,
    wakeOrder: 31,
    emoji: "👧",
    short: "Espionne les Loups-Garous pendant la nuit.",
    description:
      "La Petite Fille peut entrouvrir les yeux pendant le tour des Loups-Garous pour tenter de les identifier. Si un Loup la surprend, elle est dévorée sur-le-champ (variante) ou devient une cible évidente.",
  },
  {
    id: "voleur",
    name: "Voleur",
    camp: "special",
    max: 1,
    wakeOrder: 1,
    emoji: "🗝️",
    short: "Choisit entre deux cartes au centre.",
    description:
      "Deux cartes supplémentaires sont mises de côté au centre. La toute première nuit, le Voleur les regarde et peut en prendre une : il devient définitivement ce rôle. Si les deux cartes sont des Loups-Garous, il est obligé d'en prendre une.",
  },
  {
    id: "capitaine",
    name: "Capitaine",
    camp: "special",
    max: 1,
    derived: true,
    emoji: "🎖️",
    short: "Son vote compte double.",
    description:
      "Le Capitaine est élu par le village (ce n'est pas une carte de camp). Son vote compte double et c'est lui qui tranche en cas d'égalité. À sa mort, il désigne immédiatement son successeur.",
  },

  // ---------------- NOUVELLE LUNE ----------------
  {
    id: "ancien",
    name: "Ancien",
    camp: "villageois",
    max: 1,
    emoji: "🧓",
    short: "Survit à la première attaque des Loups.",
    description:
      "L'Ancien résiste à la première attaque des Loups-Garous : il survit et reste en jeu (il ne survit pas au poison ni au vote). Si le village l'élimine par vote, tous les villageois perdent leur pouvoir par dépit.",
  },
  {
    id: "bouc-emissaire",
    name: "Bouc Émissaire",
    camp: "villageois",
    max: 1,
    emoji: "🐐",
    short: "Meurt en cas d'égalité au vote.",
    description:
      "En cas d'égalité lors du vote du village, c'est le Bouc Émissaire qui est éliminé à la place. En mourant, il décide qui aura le droit de voter le lendemain.",
  },
  {
    id: "idiot-du-village",
    name: "Idiot du Village",
    camp: "villageois",
    max: 1,
    emoji: "🤡",
    short: "Survit à son exécution mais perd son vote.",
    description:
      "Si le village vote contre l'Idiot, sa carte est révélée : il est gracié et reste en vie, mais il perd définitivement le droit de vote et ne peut plus être élu Capitaine.",
  },
  {
    id: "joueur-de-flute",
    name: "Joueur de Flûte",
    camp: "solitaire",
    max: 1,
    wakeOrder: 60,
    emoji: "🎶",
    short: "Ensorcelle deux joueurs par nuit, seul contre tous.",
    description:
      "Chaque nuit, le Joueur de Flûte enchante deux joueurs. Il gagne seul et immédiatement si tous les survivants sont enchantés. Les joueurs enchantés sont informés chaque matin qu'ils le sont, sans savoir qui est le Flûtiste.",
  },
  {
    id: "salvateur",
    name: "Salvateur",
    camp: "villageois",
    max: 1,
    wakeOrder: 15,
    emoji: "🛡️",
    short: "Protège un joueur des Loups chaque nuit.",
    description:
      "Chaque nuit, le Salvateur protège un joueur (lui compris) de l'attaque des Loups-Garous. Il ne peut pas protéger la même personne deux nuits de suite. La protection n'agit pas contre le poison de la Sorcière.",
  },
  {
    id: "loup-garou-blanc",
    name: "Loup-Garou Blanc",
    camp: "solitaire",
    max: 1,
    wakeOrder: 32,
    emoji: "🌕",
    short: "Loup solitaire qui doit rester seul survivant.",
    description:
      "Le Loup-Garou Blanc se réveille avec les autres Loups-Garous et dévore avec eux. Mais une nuit sur deux, il se réveille seul après eux et peut éliminer un Loup-Garou. Il ne gagne que s'il est l'unique survivant de la partie.",
  },
  {
    id: "enfant-sauvage",
    name: "Enfant Sauvage",
    camp: "special",
    max: 1,
    wakeOrder: 5,
    emoji: "🐒",
    short: "Se choisit un modèle : s'il meurt, il devient Loup.",
    description:
      "La première nuit, l'Enfant Sauvage choisit un joueur comme modèle. Tant que celui-ci est vivant, l'Enfant est un simple villageois. Si son modèle meurt, il devient immédiatement Loup-Garou et joue avec eux.",
  },
  {
    id: "chien-loup",
    name: "Chien-Loup",
    camp: "special",
    max: 1,
    wakeOrder: 6,
    emoji: "🐕",
    short: "Choisit son camp la première nuit.",
    description:
      "La première nuit, le Chien-Loup décide s'il joue comme Simple Villageois ou comme Loup-Garou. Ce choix est définitif et secret.",
  },
  {
    id: "montreur-ours",
    name: "Montreur d'Ours",
    camp: "villageois",
    max: 1,
    emoji: "🐻",
    short: "Son ours grogne si un Loup est à côté de lui.",
    description:
      "Chaque matin, le Maître du Jeu fait grogner l'ours si au moins un des deux voisins directs du Montreur d'Ours est un Loup-Garou (ou l'assimilé). Un détecteur redoutable mais imprécis.",
  },
  {
    id: "renard",
    name: "Renard",
    camp: "villageois",
    max: 1,
    wakeOrder: 21,
    emoji: "🦊",
    short: "Flaire trois joueurs voisins d'un coup.",
    description:
      "Chaque nuit, le Renard désigne un joueur : le Maître du Jeu lui indique s'il y a au moins un Loup-Garou parmi ce joueur et ses deux voisins. Si la réponse est non, le Renard perd son pouvoir.",
  },
  {
    id: "soeurs",
    name: "Les Deux Sœurs",
    camp: "villageois",
    max: 2,
    wakeOrder: 7,
    emoji: "👭",
    short: "Se reconnaissent la nuit et s'allient.",
    description:
      "Les Deux Sœurs se réveillent la première nuit (et éventuellement chaque nuit selon la variante) pour se reconnaître et échanger silencieusement. Elles savent qu'elles sont villageoises l'une pour l'autre.",
  },
  {
    id: "freres",
    name: "Les Trois Frères",
    camp: "villageois",
    max: 3,
    wakeOrder: 8,
    emoji: "👬",
    short: "Trois villageois qui se reconnaissent.",
    description:
      "Les Trois Frères se réveillent ensemble la première nuit pour se reconnaître. Ils forment un noyau de confiance dans le village.",
  },
  {
    id: "corbeau",
    name: "Corbeau",
    camp: "villageois",
    max: 1,
    wakeOrder: 50,
    emoji: "🐦‍⬛",
    short: "Ajoute deux votes contre un joueur.",
    description:
      "Chaque nuit, le Corbeau désigne un joueur : le lendemain, ce joueur commence le vote avec deux voix contre lui.",
  },
  {
    id: "servante-devouee",
    name: "Servante Dévouée",
    camp: "villageois",
    max: 1,
    emoji: "🧹",
    short: "Prend la place d'un joueur éliminé.",
    description:
      "Juste avant qu'une carte éliminée ne soit révélée, la Servante Dévouée peut se dévoiler et échanger son rôle contre celui de la victime : elle prend son personnage (sans ses éventuels effets passés) et repart en jeu.",
  },
  {
    id: "juge-begue",
    name: "Juge Bègue",
    camp: "villageois",
    max: 1,
    emoji: "⚖️",
    short: "Peut déclencher un second vote.",
    description:
      "Une fois dans la partie, le Juge Bègue peut faire signe (grâce à un signe convenu avec le Maître du Jeu) pour qu'un second vote ait lieu immédiatement après le premier.",
  },
  {
    id: "villageois-villageois",
    name: "Villageois-Villageois",
    camp: "villageois",
    max: 1,
    emoji: "✅",
    short: "Sa carte prouve qu'il est innocent.",
    description:
      "Sa carte a deux faces de villageois : tout le monde sait qu'il est authentiquement du village. C'est le candidat parfait au poste de Capitaine.",
  },
  {
    id: "abominable-sectaire",
    name: "Abominable Sectaire",
    camp: "solitaire",
    max: 1,
    emoji: "🕯️",
    short: "Le village est coupé en deux groupes : il doit rester le sien.",
    description:
      "Le village est divisé en deux groupes par le Maître du Jeu. L'Abominable Sectaire gagne si tous les survivants appartiennent à son propre groupe, peu importe leur camp d'origine.",
  },
  {
    id: "infect-pere-des-loups",
    name: "Infect Père des Loups",
    camp: "loups",
    max: 1,
    wakeOrder: 33,
    emoji: "🩸",
    short: "Une fois par partie, il transforme la victime en Loup.",
    description:
      "Une seule fois dans la partie, au lieu de dévorer la victime, l'Infect Père des Loups peut l'infecter : elle survit et rejoint secrètement le camp des Loups-Garous, en conservant son pouvoir.",
  },
  {
    id: "grand-mechant-loup",
    name: "Grand Méchant Loup",
    camp: "loups",
    max: 1,
    wakeOrder: 34,
    emoji: "🐺",
    short: "Deuxième victime tant qu'aucun Loup n'est mort.",
    description:
      "Tant qu'aucun Loup-Garou (ni assimilé) n'est mort, le Grand Méchant Loup se réveille seul après ses congénères et dévore une seconde victime.",
  },

  // ---------------- PERSONNAGES ----------------
  {
    id: "ange",
    name: "Ange",
    camp: "solitaire",
    max: 1,
    emoji: "😇",
    short: "Veut mourir dès le premier tour.",
    description:
      "L'Ange gagne immédiatement s'il est éliminé lors du tout premier vote du village (ou dès la première nuit selon la variante). S'il échoue, il redevient un simple villageois.",
  },
  {
    id: "pyromane",
    name: "Pyromane",
    camp: "villageois",
    max: 1,
    wakeOrder: 55,
    emoji: "🔥",
    short: "Asperge puis enflamme.",
    description:
      "Chaque nuit, le Pyromane asperge d'essence un ou plusieurs joueurs. Une fois dans la partie, il peut choisir d'enflammer : tous les joueurs aspergés meurent d'un coup.",
  },
  {
    id: "comedien",
    name: "Comédien",
    camp: "villageois",
    max: 1,
    emoji: "🎭",
    short: "Emprunte un pouvoir chaque nuit.",
    description:
      "Trois cartes de villageois à pouvoir sont posées au centre. Chaque nuit, le Comédien en choisit une et joue ce pouvoir pour la nuit et le jour suivants. La carte est ensuite retirée du jeu.",
  },
  {
    id: "gitane",
    name: "La Gitane",
    camp: "villageois",
    max: 1,
    emoji: "🃏",
    short: "Ouvre le Spiritisme avec les morts.",
    description:
      "La Gitane permet au village d'interroger les morts : chaque nuit, elle organise une séance de spiritisme où un joueur mort répond par oui ou par non à une question posée.",
  },
  {
    id: "chevalier-epee-rouillee",
    name: "Chevalier à l'Épée Rouillée",
    camp: "villageois",
    max: 1,
    emoji: "⚔️",
    short: "En mourant, il infecte un Loup.",
    description:
      "Quand le Chevalier est dévoré par les Loups-Garous, le premier Loup-Garou situé à sa gauche meurt de la gangrène la nuit suivante.",
  },
  {
    id: "loup-feral",
    name: "Loup Féral",
    camp: "loups",
    max: 1,
    wakeOrder: 35,
    emoji: "🌑",
    short: "Peut transformer la victime en Loup Féral.",
    description:
      "Une fois par partie, le Loup Féral peut se réveiller après le repas et choisir un joueur : ce joueur devient lui aussi Loup Féral, sans le savoir des autres Loups-Garous classiques.",
  },
  {
    id: "loup-shaman",
    name: "Loup Chamane",
    camp: "loups",
    max: 1,
    wakeOrder: 36,
    emoji: "🪄",
    short: "Neutralise le pouvoir d'un villageois.",
    description:
      "Chaque nuit, le Loup Chamane désigne un joueur : le pouvoir de ce joueur est inactif pour le tour à venir.",
  },

  // ---------------- LE VILLAGE ----------------
  {
    id: "chaman",
    name: "Chaman",
    camp: "villageois",
    max: 1,
    wakeOrder: 22,
    emoji: "🪶",
    short: "Parle aux esprits une fois par nuit.",
    description:
      "Le Chaman peut chaque nuit demander au Maître du Jeu une information sur un rôle présent ou absent de la partie. Un rôle d'enquête plus subtil que la Voyante.",
  },
  {
    id: "prete",
    name: "Le Prêtre",
    camp: "villageois",
    max: 1,
    emoji: "⛪",
    short: "Bénit un joueur, l'eau bénite tue les Loups.",
    description:
      "Une fois par partie, le Prêtre jette de l'eau bénite sur un joueur : si c'est un Loup-Garou, il meurt sur-le-champ ; sinon le Prêtre meurt à sa place.",
  },
  {
    id: "gargouille",
    name: "La Gargouille",
    camp: "solitaire",
    max: 1,
    wakeOrder: 61,
    emoji: "🗿",
    short: "Pétrifie les villageois un par un.",
    description:
      "Chaque nuit, la Gargouille pétrifie un joueur qui ne pourra ni parler ni voter le jour suivant. Elle gagne seule si elle survit jusqu'à la fin.",
  },
  {
    id: "sectaire-blanc",
    name: "Le Sectaire",
    camp: "solitaire",
    max: 1,
    emoji: "🔺",
    short: "Rallie le village à sa cause.",
    description:
      "Le Sectaire tente de convertir les villageois à sa doctrine. Il gagne si, à la fin, tous les survivants appartiennent à sa secte.",
  },
  {
    id: "assassin",
    name: "L'Assassin",
    camp: "solitaire",
    max: 1,
    wakeOrder: 56,
    emoji: "🗡️",
    short: "Tue une fois par partie, en solitaire.",
    description:
      "L'Assassin joue seul. Une fois par partie il peut poignarder un joueur pendant la nuit. Il gagne s'il est encore vivant à la fin de la partie, quel que soit le camp vainqueur.",
  },

  // ---------------- NOUVELLE ÉDITION / PACTE ----------------
  {
    id: "loup-garou-noir",
    name: "Loup-Garou Noir",
    camp: "loups",
    max: 1,
    wakeOrder: 37,
    emoji: "🖤",
    short: "Invisible aux pouvoirs de détection.",
    description:
      "Le Loup-Garou Noir apparaît comme un simple villageois à la Voyante et aux autres pouvoirs de détection. Il dévore normalement avec la meute.",
  },
  {
    id: "ombre",
    name: "L'Ombre",
    camp: "loups",
    max: 1,
    wakeOrder: 38,
    emoji: "👤",
    short: "Se cache derrière un joueur pour survivre.",
    description:
      "Chaque nuit, l'Ombre se glisse derrière un joueur : si elle est attaquée cette nuit-là, l'attaque frappe son hôte à sa place.",
  },
  {
    id: "mercenaire",
    name: "Le Mercenaire",
    camp: "solitaire",
    max: 1,
    emoji: "💰",
    short: "Doit éliminer une cible précise dès le premier jour.",
    description:
      "Le Mercenaire reçoit une cible (souvent son voisin de gauche). Si cette cible est éliminée lors du premier vote, il gagne immédiatement et seul. Sinon, il devient un simple villageois.",
  },
  {
    id: "amoureux",
    name: "Amoureux",
    camp: "special",
    max: 2,
    wakeOrder: 11,
    derived: true,
    emoji: "❤️",
    short: "Lié à un autre joueur pour la vie et la mort.",
    description:
      "Statut donné par Cupidon : les deux Amoureux se connaissent et meurent ensemble. S'ils sont de camps opposés, ils forment un camp à part et doivent éliminer tous les autres.",
  },

  // ---------------- VARIANTES ----------------
  {
    id: "garde-champetre",
    name: "Garde Champêtre",
    camp: "villageois",
    max: 1,
    wakeOrder: 99,
    emoji: "🚨",
    short: "En fin de nuit, il bâillonne un joueur pour le lendemain.",
    description:
      "En toute fin de nuit, après tous les autres rôles, le Garde Champêtre désigne au Maître du Jeu un joueur qui ne pourra pas prendre la parole pendant le débat du lendemain. Le joueur bâillonné garde son droit de vote et peut communiquer par gestes ou mimiques, mais aucun son ni aucun mot écrit. Le Garde Champêtre ne peut pas re-désigner quelqu'un qu'il a déjà bâillonné : la cible redevient disponible seulement après trois nuits.",
  },
];

export const ROLES_BY_ID = Object.fromEntries(ROLES.map((r) => [r.id, r])) as Record<
  string,
  Role
>;

export function isWolfSide(role: Role) {
  return role.camp === "loups";
}
