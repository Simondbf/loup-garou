import { ROLES, ROLES_BY_ID } from "@/data/roles";

/**
 * Composition d'une table.
 *
 * Ces deux briques servaient d'abord à l'écran de création. Le salon
 * multi-téléphones en a besoin aussi : l'effectif n'y est plus décidé à
 * l'avance mais déduit des joueurs qui se connectent, et la composition doit
 * pouvoir suivre jusqu'à la dernière seconde.
 */

/** Rôles réellement distribuables : Amoureux et Capitaine découlent du jeu, pas de la pioche. */
export const ROLES_DISTRIBUABLES = ROLES.filter((r) => !r.derived);

/**
 * Rôles qui lisent les voisins de table : Renard et Montreur d'Ours.
 *
 * L'application ne connaît que l'ordre des places, et cet ordre ne suit la
 * vraie table que dans le mode un seul téléphone. Ils restent proposés
 * ailleurs : c'est au Maître du Jeu de regarder qui est réellement assis où,
 * et la conduite le lui rappelle au moment de les appeler.
 */
export const ROLES_VOISINS = ["renard", "montreur-ours"];

/**
 * Les cartes que le Comédien peut se voir proposer.
 *
 * La règle demande trois cartes personnage non-Loup « ayant des capacités
 * spéciales » : un Simple Villageois n'a rien à offrir, il est donc écarté.
 * Un rôle déjà distribué l'est aussi — il ne peut pas y avoir deux Voyantes
 * la même nuit — ce qui laisse les personnages du village restés en boîte.
 */
export function cartesComedienPossibles(selection: Record<string, number>) {
  return ROLES_DISTRIBUABLES.filter(
    (r) =>
      r.camp === "villageois" &&
      r.id !== "comedien" &&
      r.id !== "simple-villageois" &&
      r.id !== "villageois-villageois" &&
      !(selection[r.id] ?? 0),
  );
}

/** Rôles proposés à la composition. Tous, quel que soit le mode. */
export function rolesDistribuables(_unSeulTelephone: boolean) {
  return ROLES_DISTRIBUABLES;
}

/**
 * Les compositions conseillées, de 7 à 30 joueurs.
 *
 * Recopiées telles quelles du tableau `compositions-conseillees.xlsx`, à la
 * racine du dépôt, rempli par Simon le 26 septembre 2026. Pour les changer,
 * on modifie ce tableau puis on reporte ses lignes ici — le tableau fait foi.
 *
 * À partir de 14 joueurs, plusieurs lignes comptent plus de cartes que de
 * joueurs : c'est voulu pour l'instant, le Maître du Jeu retire lui-même
 * l'excédent avant de distribuer. Les deux cartes du centre du Voleur et les
 * trois du Comédien n'y figurent pas : elles s'ajoutent à part.
 */
const CONSEILLEES: Record<number, Record<string, number>> = {
  7: { "loup-garou": 2, voyante: 1, sorciere: 1, chasseur: 1, cupidon: 1, voleur: 1 },
  8: { "loup-garou": 2, voyante: 1, sorciere: 1, chasseur: 1, cupidon: 1, voleur: 1, comedien: 1 },
  9: {
    "loup-garou": 2,
    voyante: 1,
    sorciere: 1,
    chasseur: 1,
    cupidon: 1,
    voleur: 1,
    comedien: 1,
    "joueur-de-flute": 1,
  },
  10: {
    "loup-garou": 2,
    voyante: 1,
    sorciere: 1,
    chasseur: 1,
    cupidon: 1,
    salvateur: 1,
    voleur: 1,
    "servante-devouee": 1,
    comedien: 1,
  },
  11: {
    "loup-garou": 2,
    voyante: 1,
    sorciere: 1,
    chasseur: 1,
    cupidon: 1,
    salvateur: 1,
    voleur: 1,
    "servante-devouee": 1,
    comedien: 1,
    "joueur-de-flute": 1,
  },
  12: {
    "loup-garou": 3,
    "infect-pere-des-loups": 1,
    voyante: 1,
    sorciere: 1,
    cupidon: 1,
    salvateur: 1,
    magicien: 1,
    voleur: 1,
    comedien: 1,
    "joueur-de-flute": 1,
  },
  13: {
    "loup-garou": 3,
    "infect-pere-des-loups": 1,
    voyante: 1,
    sorciere: 1,
    cupidon: 1,
    salvateur: 1,
    magicien: 1,
    voleur: 1,
    "enfant-sauvage": 1,
    comedien: 1,
    "joueur-de-flute": 1,
  },
  14: {
    "loup-garou": 3,
    "infect-pere-des-loups": 1,
    voyante: 1,
    sorciere: 1,
    cupidon: 1,
    salvateur: 1,
    magicien: 1,
    voleur: 1,
    "enfant-sauvage": 1,
    "chien-loup": 1,
    "servante-devouee": 1,
    comedien: 1,
    "joueur-de-flute": 1,
    "loup-garou-blanc": 1,
    ange: 1,
  },
  15: {
    "loup-garou": 3,
    "infect-pere-des-loups": 1,
    voyante: 1,
    sorciere: 1,
    cupidon: 1,
    salvateur: 1,
    magicien: 1,
    voleur: 1,
    "enfant-sauvage": 1,
    "chien-loup": 1,
    "servante-devouee": 1,
    comedien: 1,
    "joueur-de-flute": 1,
    "loup-garou-blanc": 1,
    "abominable-sectaire": 1,
    ange: 1,
  },
  16: {
    "loup-garou": 4,
    "infect-pere-des-loups": 1,
    voyante: 1,
    sorciere: 1,
    cupidon: 1,
    salvateur: 1,
    "chevalier-epee-rouillee": 1,
    magicien: 1,
    voleur: 1,
    "enfant-sauvage": 1,
    "chien-loup": 1,
    "servante-devouee": 1,
    comedien: 1,
    "joueur-de-flute": 1,
    "loup-garou-blanc": 1,
    "abominable-sectaire": 1,
    ange: 1,
  },
  17: {
    "loup-garou": 4,
    "infect-pere-des-loups": 1,
    voyante: 1,
    sorciere: 1,
    chasseur: 1,
    cupidon: 1,
    "petite-fille": 1,
    salvateur: 1,
    "chevalier-epee-rouillee": 1,
    magicien: 1,
    voleur: 1,
    "enfant-sauvage": 1,
    "chien-loup": 1,
    "servante-devouee": 1,
    comedien: 1,
    "joueur-de-flute": 1,
    "loup-garou-blanc": 1,
    "abominable-sectaire": 1,
    ange: 1,
  },
  18: {
    "loup-garou": 4,
    "infect-pere-des-loups": 1,
    "grand-mechant-loup": 1,
    voyante: 1,
    sorciere: 1,
    chasseur: 1,
    cupidon: 1,
    "petite-fille": 1,
    salvateur: 1,
    "montreur-ours": 1,
    "chevalier-epee-rouillee": 1,
    magicien: 1,
    voleur: 1,
    "enfant-sauvage": 1,
    "chien-loup": 1,
    "servante-devouee": 1,
    comedien: 1,
    "joueur-de-flute": 1,
    "loup-garou-blanc": 1,
    "abominable-sectaire": 1,
    ange: 1,
  },
  19: {
    "loup-garou": 4,
    "infect-pere-des-loups": 1,
    "grand-mechant-loup": 1,
    voyante: 1,
    sorciere: 1,
    chasseur: 1,
    cupidon: 1,
    "petite-fille": 1,
    "idiot-du-village": 1,
    salvateur: 1,
    "montreur-ours": 1,
    "chevalier-epee-rouillee": 1,
    magicien: 1,
    voleur: 1,
    "enfant-sauvage": 1,
    "chien-loup": 1,
    "servante-devouee": 1,
    comedien: 1,
    "joueur-de-flute": 1,
    "loup-garou-blanc": 1,
    "abominable-sectaire": 1,
    ange: 1,
  },
  20: {
    "loup-garou": 5,
    "infect-pere-des-loups": 1,
    "grand-mechant-loup": 1,
    voyante: 1,
    sorciere: 1,
    chasseur: 1,
    cupidon: 1,
    "petite-fille": 1,
    "idiot-du-village": 1,
    salvateur: 1,
    "montreur-ours": 1,
    "juge-begue": 1,
    "chevalier-epee-rouillee": 1,
    magicien: 1,
    voleur: 1,
    "enfant-sauvage": 1,
    "chien-loup": 1,
    "servante-devouee": 1,
    comedien: 1,
    "joueur-de-flute": 1,
    "loup-garou-blanc": 1,
    "abominable-sectaire": 1,
    ange: 1,
  },
  21: {
    "loup-garou": 5,
    "infect-pere-des-loups": 1,
    "grand-mechant-loup": 1,
    voyante: 1,
    sorciere: 1,
    chasseur: 1,
    cupidon: 1,
    "petite-fille": 1,
    "bouc-emissaire": 1,
    "idiot-du-village": 1,
    salvateur: 1,
    "montreur-ours": 1,
    renard: 1,
    soeurs: 2,
    "juge-begue": 1,
    "chevalier-epee-rouillee": 1,
    magicien: 1,
    voleur: 1,
    "enfant-sauvage": 1,
    "chien-loup": 1,
    "servante-devouee": 1,
    "joueur-de-flute": 1,
    "loup-garou-blanc": 1,
    "abominable-sectaire": 1,
    ange: 1,
  },
  22: {
    "loup-garou": 5,
    "infect-pere-des-loups": 1,
    "grand-mechant-loup": 1,
    voyante: 1,
    sorciere: 1,
    chasseur: 1,
    cupidon: 1,
    "petite-fille": 1,
    ancien: 1,
    "bouc-emissaire": 1,
    "idiot-du-village": 1,
    salvateur: 1,
    "montreur-ours": 1,
    renard: 1,
    soeurs: 2,
    "juge-begue": 1,
    "chevalier-epee-rouillee": 1,
    magicien: 1,
    voleur: 1,
    "enfant-sauvage": 1,
    "chien-loup": 1,
    "servante-devouee": 1,
    "joueur-de-flute": 1,
    "loup-garou-blanc": 1,
    "abominable-sectaire": 1,
    ange: 1,
  },
  23: {
    "loup-garou": 5,
    "infect-pere-des-loups": 1,
    "grand-mechant-loup": 1,
    voyante: 1,
    sorciere: 1,
    chasseur: 1,
    cupidon: 1,
    "petite-fille": 1,
    ancien: 1,
    "bouc-emissaire": 1,
    "idiot-du-village": 1,
    salvateur: 1,
    "montreur-ours": 1,
    renard: 1,
    soeurs: 2,
    "juge-begue": 1,
    "chevalier-epee-rouillee": 1,
    magicien: 1,
    voleur: 1,
    "enfant-sauvage": 1,
    "chien-loup": 1,
    "servante-devouee": 1,
    "joueur-de-flute": 1,
    "loup-garou-blanc": 1,
    "abominable-sectaire": 1,
    ange: 1,
  },
  24: {
    "loup-garou": 5,
    "infect-pere-des-loups": 1,
    "grand-mechant-loup": 1,
    voyante: 1,
    sorciere: 1,
    chasseur: 1,
    cupidon: 1,
    "petite-fille": 1,
    ancien: 1,
    "bouc-emissaire": 1,
    "idiot-du-village": 1,
    salvateur: 1,
    "montreur-ours": 1,
    renard: 1,
    soeurs: 2,
    freres: 3,
    "juge-begue": 1,
    "chevalier-epee-rouillee": 1,
    magicien: 1,
    voleur: 1,
    "enfant-sauvage": 1,
    "chien-loup": 1,
    "servante-devouee": 1,
    "joueur-de-flute": 1,
    "loup-garou-blanc": 1,
    "abominable-sectaire": 1,
    ange: 1,
  },
  25: {
    "loup-garou": 5,
    "infect-pere-des-loups": 1,
    "grand-mechant-loup": 1,
    voyante: 1,
    sorciere: 1,
    chasseur: 1,
    cupidon: 1,
    "petite-fille": 1,
    ancien: 1,
    "bouc-emissaire": 1,
    "idiot-du-village": 1,
    salvateur: 1,
    "montreur-ours": 1,
    renard: 1,
    soeurs: 2,
    freres: 3,
    "juge-begue": 1,
    "villageois-villageois": 1,
    "chevalier-epee-rouillee": 1,
    magicien: 1,
    voleur: 1,
    "enfant-sauvage": 1,
    "chien-loup": 1,
    "servante-devouee": 1,
    "joueur-de-flute": 1,
    "loup-garou-blanc": 1,
    "abominable-sectaire": 1,
    ange: 1,
  },
  26: {
    "loup-garou": 5,
    "infect-pere-des-loups": 1,
    "grand-mechant-loup": 1,
    voyante: 1,
    sorciere: 1,
    chasseur: 1,
    cupidon: 1,
    "petite-fille": 1,
    ancien: 1,
    "bouc-emissaire": 1,
    "idiot-du-village": 1,
    salvateur: 1,
    "montreur-ours": 1,
    renard: 1,
    soeurs: 2,
    freres: 3,
    "juge-begue": 1,
    "villageois-villageois": 1,
    "chevalier-epee-rouillee": 1,
    magicien: 1,
    voleur: 1,
    "enfant-sauvage": 1,
    "chien-loup": 1,
    "servante-devouee": 1,
    "joueur-de-flute": 1,
    "loup-garou-blanc": 1,
    "abominable-sectaire": 1,
    ange: 1,
  },
  27: {
    "loup-garou": 5,
    "infect-pere-des-loups": 1,
    "grand-mechant-loup": 1,
    voyante: 1,
    sorciere: 1,
    chasseur: 1,
    cupidon: 1,
    "petite-fille": 1,
    ancien: 1,
    "bouc-emissaire": 1,
    "idiot-du-village": 1,
    salvateur: 1,
    "montreur-ours": 1,
    renard: 1,
    soeurs: 2,
    freres: 3,
    "juge-begue": 1,
    "villageois-villageois": 1,
    "chevalier-epee-rouillee": 1,
    magicien: 1,
    voleur: 1,
    "enfant-sauvage": 1,
    "chien-loup": 1,
    "servante-devouee": 1,
    "joueur-de-flute": 1,
    "loup-garou-blanc": 1,
    "abominable-sectaire": 1,
    ange: 1,
  },
  28: {
    "loup-garou": 5,
    "infect-pere-des-loups": 1,
    "grand-mechant-loup": 1,
    voyante: 1,
    sorciere: 1,
    chasseur: 1,
    cupidon: 1,
    "petite-fille": 1,
    ancien: 1,
    "bouc-emissaire": 1,
    "idiot-du-village": 1,
    salvateur: 1,
    "montreur-ours": 1,
    renard: 1,
    soeurs: 2,
    freres: 3,
    "juge-begue": 1,
    "villageois-villageois": 1,
    "chevalier-epee-rouillee": 1,
    magicien: 1,
    voleur: 1,
    "enfant-sauvage": 1,
    "chien-loup": 1,
    "servante-devouee": 1,
    "joueur-de-flute": 1,
    "loup-garou-blanc": 1,
    "abominable-sectaire": 1,
    ange: 1,
  },
  29: {
    "loup-garou": 5,
    "infect-pere-des-loups": 1,
    "grand-mechant-loup": 1,
    voyante: 1,
    sorciere: 1,
    chasseur: 1,
    cupidon: 1,
    "petite-fille": 1,
    ancien: 1,
    "bouc-emissaire": 1,
    "idiot-du-village": 1,
    salvateur: 1,
    "montreur-ours": 1,
    renard: 1,
    soeurs: 2,
    freres: 3,
    "juge-begue": 1,
    "villageois-villageois": 1,
    "chevalier-epee-rouillee": 1,
    magicien: 1,
    voleur: 1,
    "enfant-sauvage": 1,
    "chien-loup": 1,
    "servante-devouee": 1,
    "joueur-de-flute": 1,
    "loup-garou-blanc": 1,
    "abominable-sectaire": 1,
    ange: 1,
  },
  30: {
    "loup-garou": 5,
    "infect-pere-des-loups": 1,
    "grand-mechant-loup": 1,
    voyante: 1,
    sorciere: 1,
    chasseur: 1,
    cupidon: 1,
    "petite-fille": 1,
    ancien: 1,
    "bouc-emissaire": 1,
    "idiot-du-village": 1,
    salvateur: 1,
    "montreur-ours": 1,
    renard: 1,
    soeurs: 2,
    freres: 3,
    "juge-begue": 1,
    "villageois-villageois": 1,
    "chevalier-epee-rouillee": 1,
    magicien: 1,
    voleur: 1,
    "enfant-sauvage": 1,
    "chien-loup": 1,
    "servante-devouee": 1,
    "joueur-de-flute": 1,
    "loup-garou-blanc": 1,
    "abominable-sectaire": 1,
    ange: 1,
  },
};

/**
 * Composition conseillée pour un effectif donné.
 *
 * La ligne du tableau, à une chose près : en mode un seul téléphone, le
 * Voleur choisit parmi deux cartes posées au centre, et ces deux cartes — des
 * Simples Villageois — s'ajoutent au paquet.
 */
export function compositionAuto(
  count: number,
  _unSeulTelephone = true,
  variante = "centre",
): Record<string, number> {
  const ligne = CONSEILLEES[Math.min(30, Math.max(7, count))] ?? {};
  const base = { ...ligne };
  if (base["voleur"] && variante === "centre") {
    base["simple-villageois"] = (base["simple-villageois"] ?? 0) + 2;
  }
  return base;
}

/**
 * Nombre de cartes à réunir : une par joueur, plus celles du centre.
 *
 * Deux pour le Voleur. Les trois cartes du Comédien n'en font pas partie :
 * elles viennent de la boîte, pas de la composition.
 */
export function cartesAttendues(
  count: number,
  selection: Record<string, number>,
  variante: string,
) {
  return count + (selection["voleur"] && variante === "centre" ? 2 : 0);
}

/** Rôles qui se jouent en groupe fixe : les Deux Sœurs, les Trois Frères. */
export const FRATRIES = ["soeurs", "freres"];

/** Ajoute ou retire un exemplaire d'un rôle, sans dépasser le maximum du livret. */
export function ajusterRole(
  selection: Record<string, number>,
  roleId: string,
  delta: number,
): Record<string, number> {
  const role = ROLES_BY_ID[roleId];
  if (!role) return selection;
  const max = role.max === 0 ? 99 : role.max;
  const actuel = selection[roleId] ?? 0;
  // Les fratries n'existent qu'au complet : un Frère seul ne reconnaît
  // personne. Leur compteur saute donc de zéro au groupe entier, et retour.
  const suivant = FRATRIES.includes(roleId)
    ? delta > 0
      ? max
      : 0
    : Math.max(0, Math.min(max, actuel + delta));
  const copie = { ...selection };
  if (suivant === 0) delete copie[roleId];
  else copie[roleId] = suivant;
  return copie;
}

/**
 * Peut-on encore ajouter ce rôle ?
 *
 * Non s'il a atteint son maximum, et non si la composition déborderait —
 * pour tous les rôles, y compris les Loups-Garous et les Simples Villageois
 * qui n'ont pas de maximum propre. On essaie l'ajout pour de bon avant de
 * compter : ajouter le Voleur en variante « cartes au centre » réclame deux
 * cartes de plus, et une fratrie arrive entière. Un simple « reste-t-il une
 * place ? » se tromperait dans les deux cas.
 */
export function ajoutPossible(
  selection: Record<string, number>,
  roleId: string,
  attendu?: (selection: Record<string, number>) => number,
) {
  const avant = selection[roleId] ?? 0;
  const apres = ajusterRole(selection, roleId, 1);
  if ((apres[roleId] ?? 0) === avant) return false;
  if (!attendu) return true;
  const total = Object.values(apres).reduce((a, b) => a + b, 0);
  return total <= attendu(apres);
}
