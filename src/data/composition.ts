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
 * vraie table que dans le mode un seul téléphone, où le Maître du Jeu
 * distribue les places en tournant. En multi-téléphones, les places sont
 * attribuées dans l'ordre des connexions : le voisin de gauche à l'écran
 * n'est pas celui qui est assis à gauche. Ces deux rôles y sont donc
 * retirés de la pioche plutôt que de rendre des réponses fausses.
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

/** Rôles proposés selon le mode de jeu. */
export function rolesDistribuables(unSeulTelephone: boolean) {
  if (unSeulTelephone) return ROLES_DISTRIBUABLES;
  return ROLES_DISTRIBUABLES.filter((r) => !ROLES_VOISINS.includes(r.id));
}

/**
 * Les répartitions conseillées, de 7 à 18 joueurs.
 *
 * Celles du livret, à deux nuances près. Sept joueurs sort de la fourchette
 * officielle — la boîte annonce 8 à 18 — mais la table existe quand même, et
 * mieux vaut lui donner un équilibre correct qu'un tirage au hasard. Et le
 * Voleur, qui apparaît à partir de douze, réclame deux Simples Villageois de
 * plus : ils sont ajoutés plus bas, seulement en variante « cartes au
 * centre », puisque c'est elle qui les consomme.
 *
 * Le nombre de Loups suit le livret : deux jusqu'à onze, trois jusqu'à
 * quinze, quatre au-delà. Les rôles à pouvoir s'ajoutent au fur et à mesure
 * que la table grandit, en alternant Petite Fille et Sorcière comme le fait
 * la règle.
 */
const CONSEILLEES: Record<number, Record<string, number>> = {
  7: { "loup-garou": 2, voyante: 1, sorciere: 1, "simple-villageois": 3 },
  8: { "loup-garou": 2, voyante: 1, chasseur: 1, "simple-villageois": 4 },
  9: { "loup-garou": 2, voyante: 1, chasseur: 1, cupidon: 1, "simple-villageois": 4 },
  10: {
    "loup-garou": 2,
    voyante: 1,
    "petite-fille": 1,
    chasseur: 1,
    cupidon: 1,
    "simple-villageois": 4,
  },
  11: {
    "loup-garou": 2,
    voyante: 1,
    sorciere: 1,
    chasseur: 1,
    cupidon: 1,
    "simple-villageois": 5,
  },
  12: {
    "loup-garou": 3,
    voyante: 1,
    "petite-fille": 1,
    chasseur: 1,
    cupidon: 1,
    voleur: 1,
    "simple-villageois": 4,
  },
  13: {
    "loup-garou": 3,
    voyante: 1,
    sorciere: 1,
    chasseur: 1,
    cupidon: 1,
    voleur: 1,
    "simple-villageois": 5,
  },
  14: {
    "loup-garou": 3,
    voyante: 1,
    "petite-fille": 1,
    chasseur: 1,
    cupidon: 1,
    voleur: 1,
    "simple-villageois": 6,
  },
  15: {
    "loup-garou": 3,
    voyante: 1,
    sorciere: 1,
    chasseur: 1,
    cupidon: 1,
    voleur: 1,
    "simple-villageois": 7,
  },
  16: {
    "loup-garou": 4,
    voyante: 1,
    sorciere: 1,
    "petite-fille": 1,
    chasseur: 1,
    cupidon: 1,
    salvateur: 1,
    "simple-villageois": 6,
  },
  17: {
    "loup-garou": 4,
    voyante: 1,
    sorciere: 1,
    "petite-fille": 1,
    chasseur: 1,
    cupidon: 1,
    salvateur: 1,
    ancien: 1,
    "simple-villageois": 6,
  },
  18: {
    "loup-garou": 4,
    voyante: 1,
    sorciere: 1,
    "petite-fille": 1,
    chasseur: 1,
    cupidon: 1,
    salvateur: 1,
    ancien: 1,
    "idiot-du-village": 1,
    "simple-villageois": 6,
  },
};

/** Rôles ajoutés un à un quand la table dépasse le tableau du livret. */
const RENFORTS = [
  "bouc-emissaire",
  "juge-begue",
  "servante-devouee",
  "montreur-ours",
  "renard",
  "chien-loup",
  "enfant-sauvage",
];

/**
 * Composition conseillée pour un effectif donné.
 *
 * On part du tableau du livret. Au-delà de dix-huit joueurs, on prolonge : un
 * Loup pour quatre joueurs environ, les rôles à pouvoir ajoutés un à un, et
 * le reste en Simples Villageois. En dessous de sept, la table est trop
 * petite pour un équilibre honnête, mais on rend quand même quelque chose de
 * jouable plutôt que rien.
 */
export function compositionAuto(
  count: number,
  unSeulTelephone = true,
  variante = "centre",
): Record<string, number> {
  const ecartes = unSeulTelephone ? [] : ROLES_VOISINS;
  let base: Record<string, number>;

  const table = CONSEILLEES[count];
  if (table) {
    base = { ...table };
  } else if (count > 18) {
    base = { ...CONSEILLEES[18]! };
    base["loup-garou"] = Math.max(4, Math.round(count / 4));
    let reste = count - Object.values(base).reduce((a, b) => a + b, 0);
    for (const id of RENFORTS) {
      if (reste <= 0) break;
      if (ecartes.includes(id)) continue;
      base[id] = 1;
      reste -= 1;
    }
    if (reste > 0) base["simple-villageois"] = (base["simple-villageois"] ?? 0) + reste;
  } else {
    // Moins de sept : un Loup, la Voyante, et des villageois.
    base = { "loup-garou": 1, voyante: 1, "simple-villageois": Math.max(0, count - 2) };
  }

  // Les rôles de voisinage ne marchent qu'en mode un seul téléphone : on les
  // remplace par des Simples Villageois plutôt que de laisser un trou.
  for (const id of ecartes) {
    if (base[id]) {
      base["simple-villageois"] = (base["simple-villageois"] ?? 0) + base[id]!;
      delete base[id];
    }
  }

  // Le Voleur emporte deux cartes au centre : il faut les ajouter au paquet.
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
  return (
    count + (selection["voleur"] && variante === "centre" ? 2 : 0) + (selection["comedien"] ? 3 : 0)
  );
}

/** Ajoute ou retire un exemplaire d'un rôle, sans dépasser le maximum du livret. */
export function ajusterRole(
  selection: Record<string, number>,
  roleId: string,
  delta: number,
): Record<string, number> {
  const role = ROLES_BY_ID[roleId];
  if (!role) return selection;
  const max = role.max === 0 ? 99 : role.max;
  const suivant = Math.max(0, Math.min(max, (selection[roleId] ?? 0) + delta));
  const copie = { ...selection };
  if (suivant === 0) delete copie[roleId];
  else copie[roleId] = suivant;
  return copie;
}
