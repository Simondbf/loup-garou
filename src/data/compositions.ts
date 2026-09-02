export interface Composition {
  id: string;
  name: string;
  players: number;
  difficulty: "Découverte" | "Classique" | "Corsée" | "Chaos";
  description: string;
  /** roleId -> nombre d'exemplaires */
  roles: Record<string, number>;
}

export const COMPOSITIONS: Composition[] = [
  {
    id: "6-init",
    name: "Première meute",
    players: 6,
    difficulty: "Découverte",
    description: "La composition minimale pour découvrir le jeu à 6.",
    roles: { "loup-garou": 1, voyante: 1, sorciere: 1, "simple-villageois": 3 },
  },
  {
    id: "6-nerveux",
    name: "Nuit nerveuse",
    players: 6,
    difficulty: "Classique",
    description: "Deux loups, peu de pouvoirs : ça va vite.",
    roles: { "loup-garou": 2, voyante: 1, chasseur: 1, "simple-villageois": 2 },
  },
  {
    id: "7-classique",
    name: "Village tranquille",
    players: 7,
    difficulty: "Découverte",
    description: "Équilibre parfait pour une première partie à 7.",
    roles: { "loup-garou": 2, voyante: 1, sorciere: 1, "simple-villageois": 3 },
  },
  {
    id: "8-classique",
    name: "Le classique",
    players: 8,
    difficulty: "Classique",
    description: "La composition de référence du jeu de base à 8 joueurs.",
    roles: {
      "loup-garou": 2,
      voyante: 1,
      sorciere: 1,
      chasseur: 1,
      "petite-fille": 1,
      "simple-villageois": 2,
    },
  },
  {
    id: "8-amour",
    name: "Amours contrariées",
    players: 8,
    difficulty: "Classique",
    description: "Cupidon entre en scène : les alliances deviennent floues.",
    roles: {
      "loup-garou": 2,
      cupidon: 1,
      voyante: 1,
      sorciere: 1,
      "simple-villageois": 3,
    },
  },
  {
    id: "9-nouvelle-lune",
    name: "Nouvelle Lune",
    players: 9,
    difficulty: "Corsée",
    description: "Première incursion dans l'extension Nouvelle Lune.",
    roles: {
      "loup-garou": 2,
      "loup-garou-blanc": 1,
      voyante: 1,
      salvateur: 1,
      sorciere: 1,
      ancien: 1,
      "simple-villageois": 2,
    },
  },
  {
    id: "10-classique",
    name: "Village complet",
    players: 10,
    difficulty: "Classique",
    description: "Toutes les grandes figures du jeu de base réunies.",
    roles: {
      "loup-garou": 3,
      voyante: 1,
      sorciere: 1,
      chasseur: 1,
      cupidon: 1,
      "petite-fille": 1,
      "simple-villageois": 2,
    },
  },
  {
    id: "10-flute",
    name: "L'air du flûtiste",
    players: 10,
    difficulty: "Corsée",
    description: "Un troisième camp s'invite : personne ne sait qui gagne.",
    roles: {
      "loup-garou": 2,
      "joueur-de-flute": 1,
      voyante: 1,
      sorciere: 1,
      salvateur: 1,
      "idiot-du-village": 1,
      "simple-villageois": 3,
    },
  },
  {
    id: "11-sauvage",
    name: "L'enfant et la meute",
    players: 11,
    difficulty: "Corsée",
    description: "Enfant Sauvage et Infect Père : la meute peut grossir.",
    roles: {
      "loup-garou": 2,
      "infect-pere-des-loups": 1,
      "enfant-sauvage": 1,
      voyante: 1,
      sorciere: 1,
      chasseur: 1,
      renard: 1,
      "simple-villageois": 3,
    },
  },
  {
    id: "12-grand-village",
    name: "Grand village",
    players: 12,
    difficulty: "Classique",
    description: "Beaucoup de monde, beaucoup de bruit, beaucoup de mensonges.",
    roles: {
      "loup-garou": 3,
      voyante: 1,
      sorciere: 1,
      chasseur: 1,
      cupidon: 1,
      "petite-fille": 1,
      ancien: 1,
      "simple-villageois": 3,
    },
  },
  {
    id: "12-fratrie",
    name: "Sœurs & Frères",
    players: 12,
    difficulty: "Corsée",
    description: "Des noyaux de confiance face à une meute renforcée.",
    roles: {
      "loup-garou": 2,
      "grand-mechant-loup": 1,
      soeurs: 2,
      freres: 3,
      voyante: 1,
      sorciere: 1,
      salvateur: 1,
      "simple-villageois": 1,
    },
  },
  {
    id: "14-chaos",
    name: "Nuit de chaos",
    players: 14,
    difficulty: "Chaos",
    description: "Trois camps solitaires, aucune certitude.",
    roles: {
      "loup-garou": 3,
      "loup-garou-blanc": 1,
      "joueur-de-flute": 1,
      voyante: 1,
      sorciere: 1,
      salvateur: 1,
      chasseur: 1,
      corbeau: 1,
      "bouc-emissaire": 1,
      "simple-villageois": 3,
    },
  },
  {
    id: "15-legende",
    name: "Légendes du village",
    players: 15,
    difficulty: "Corsée",
    description: "Un grand village riche en pouvoirs, pour joueurs aguerris.",
    roles: {
      "loup-garou": 3,
      "infect-pere-des-loups": 1,
      voyante: 1,
      sorciere: 1,
      chasseur: 1,
      cupidon: 1,
      salvateur: 1,
      ancien: 1,
      "idiot-du-village": 1,
      renard: 1,
      "montreur-ours": 1,
      "simple-villageois": 2,
    },
  },
  {
    id: "18-epopee",
    name: "Épopée",
    players: 18,
    difficulty: "Chaos",
    description: "La partie fleuve : toutes les extensions se croisent.",
    roles: {
      "loup-garou": 4,
      "grand-mechant-loup": 1,
      "loup-garou-blanc": 1,
      "joueur-de-flute": 1,
      voyante: 1,
      sorciere: 1,
      chasseur: 1,
      cupidon: 1,
      salvateur: 1,
      ancien: 1,
      "servante-devouee": 1,
      "juge-begue": 1,
      corbeau: 1,
      soeurs: 2,
    },
  },
];

export function compositionsFor(players: number) {
  return COMPOSITIONS.filter((c) => c.players === players);
}

/** Nombre de loups conseillé pour un nombre de joueurs donné */
export function suggestedWolves(players: number) {
  if (players <= 7) return 2;
  if (players <= 11) return 3;
  if (players <= 15) return 4;
  return 5;
}
