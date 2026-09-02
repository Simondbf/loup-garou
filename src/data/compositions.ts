export interface Composition {
  id: string;
  name: string;
  players: number;
  difficulty: "Découverte" | "Classique" | "Corsée" | "Chaos";
  description: string;
  /** roleId -> nombre d'exemplaires */
  roles: Record<string, number>;
}

/**
 * Compositions équilibrées : environ un tiers de joueurs du camp des loups,
 * et très peu de Simples Villageois (rôle sans pouvoir, vite ennuyeux).
 */
export const COMPOSITIONS: Composition[] = [
  {
    id: "7-classique",
    name: "Village tranquille",
    players: 7,
    difficulty: "Découverte",
    description: "2 loups face à 5 villageois, presque tous dotés d'un pouvoir.",
    roles: {
      "loup-garou": 2,
      voyante: 1,
      sorciere: 1,
      chasseur: 1,
      cupidon: 1,
      "simple-villageois": 1,
    },
  },
  {
    id: "8-classique",
    name: "Le classique",
    players: 8,
    difficulty: "Classique",
    description: "3 loups, un village entièrement armé de pouvoirs.",
    roles: {
      "loup-garou": 3,
      voyante: 1,
      sorciere: 1,
      chasseur: 1,
      "petite-fille": 1,
      salvateur: 1,
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
      "loup-garou-blanc": 1,
      cupidon: 1,
      voyante: 1,
      sorciere: 1,
      chasseur: 1,
      renard: 1,
    },
  },
  {
    id: "9-nouvelle-lune",
    name: "Nouvelle Lune",
    players: 9,
    difficulty: "Corsée",
    description: "Une meute de 3 et des villageois retors.",
    roles: {
      "loup-garou": 2,
      "loup-garou-blanc": 1,
      voyante: 1,
      salvateur: 1,
      sorciere: 1,
      ancien: 1,
      renard: 1,
      chasseur: 1,
    },
  },
  {
    id: "10-classique",
    name: "Village complet",
    players: 10,
    difficulty: "Classique",
    description: "4 joueurs côté loups : le village doit être efficace.",
    roles: {
      "loup-garou": 3,
      "infect-pere-des-loups": 1,
      voyante: 1,
      sorciere: 1,
      chasseur: 1,
      cupidon: 1,
      "petite-fille": 1,
      salvateur: 1,
    },
  },
  {
    id: "10-flute",
    name: "L'air du flûtiste",
    players: 10,
    difficulty: "Corsée",
    description: "Trois camps : loups, village et Joueur de Flûte.",
    roles: {
      "loup-garou": 3,
      "joueur-de-flute": 1,
      voyante: 1,
      sorciere: 1,
      salvateur: 1,
      "idiot-du-village": 1,
      chasseur: 1,
      renard: 1,
    },
  },
  {
    id: "11-sauvage",
    name: "L'enfant et la meute",
    players: 11,
    difficulty: "Corsée",
    description: "Enfant Sauvage et Infect Père : la meute peut grossir.",
    roles: {
      "loup-garou": 3,
      "infect-pere-des-loups": 1,
      "enfant-sauvage": 1,
      voyante: 1,
      sorciere: 1,
      chasseur: 1,
      renard: 1,
      salvateur: 1,
      ancien: 1,
    },
  },
  {
    id: "12-grand-village",
    name: "Grand village",
    players: 12,
    difficulty: "Classique",
    description: "4 loups, beaucoup de bruit, beaucoup de mensonges.",
    roles: {
      "loup-garou": 4,
      voyante: 1,
      sorciere: 1,
      chasseur: 1,
      cupidon: 1,
      "petite-fille": 1,
      ancien: 1,
      salvateur: 1,
      "bouc-emissaire": 1,
    },
  },
  {
    id: "12-fratrie",
    name: "Sœurs & Frères",
    players: 12,
    difficulty: "Corsée",
    description: "Des noyaux de confiance face à une meute renforcée.",
    roles: {
      "loup-garou": 3,
      "grand-mechant-loup": 1,
      soeurs: 2,
      freres: 3,
      voyante: 1,
      sorciere: 1,
      salvateur: 1,
    },
  },
  {
    id: "14-chaos",
    name: "Nuit de chaos",
    players: 14,
    difficulty: "Chaos",
    description: "Cinq joueurs hors du village : aucune certitude.",
    roles: {
      "loup-garou": 3,
      "grand-mechant-loup": 1,
      "loup-garou-blanc": 1,
      "joueur-de-flute": 1,
      voyante: 1,
      sorciere: 1,
      salvateur: 1,
      chasseur: 1,
      corbeau: 1,
      "bouc-emissaire": 1,
      ancien: 1,
      renard: 1,
    },
  },
  {
    id: "15-legende",
    name: "Légendes du village",
    players: 15,
    difficulty: "Corsée",
    description: "Un grand village riche en pouvoirs, meute de 5.",
    roles: {
      "loup-garou": 3,
      "infect-pere-des-loups": 1,
      "grand-mechant-loup": 1,
      voyante: 1,
      sorciere: 1,
      chasseur: 1,
      cupidon: 1,
      salvateur: 1,
      ancien: 1,
      "idiot-du-village": 1,
      renard: 1,
      "montreur-ours": 1,
      "petite-fille": 1,
      corbeau: 1,
    },
  },
  {
    id: "18-epopee",
    name: "Épopée",
    players: 18,
    difficulty: "Chaos",
    description: "La partie fleuve : tous les rôles se croisent, 6 joueurs côté loups.",
    roles: {
      "loup-garou": 3,
      "grand-mechant-loup": 1,
      "infect-pere-des-loups": 1,
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
      renard: 1,
      soeurs: 2,
    },
  },
];

export function compositionsFor(players: number) {
  return COMPOSITIONS.filter((c) => c.players === players);
}

/** Nombre de joueurs côté loups conseillé : environ un tiers de la table. */
export function suggestedWolves(players: number) {
  return Math.max(2, Math.round(players / 3));
}
