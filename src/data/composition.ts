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
 * Composition de secours : environ un tiers de la table côté loups, et le
 * moins de Simples Villageois possible — c'est le seul rôle sans pouvoir,
 * donc le moins amusant à tirer.
 */
export function compositionAuto(count: number): Record<string, number> {
  // Le plafond `count - 2` ne sert qu'aux toutes petites tables : à trois
  // joueurs, une meute d'un tiers ferait déjà deux loups contre un villageois.
  const loups = Math.max(1, Math.min(Math.round(count / 3), Math.max(1, count - 2)));
  const base: Record<string, number> = { "loup-garou": loups };
  let reste = count - loups;
  for (const id of [
    "voyante",
    "sorciere",
    "chasseur",
    "cupidon",
    "salvateur",
    "petite-fille",
    "ancien",
    "renard",
    "idiot-du-village",
    "bouc-emissaire",
    "montreur-ours",
    "juge-begue",
    "servante-devouee",
  ]) {
    if (reste <= 0) break;
    base[id] = 1;
    reste -= 1;
  }
  if (reste > 0) base["simple-villageois"] = reste;
  return base;
}

/** Nombre de cartes à distribuer, cartes du centre du Voleur comprises. */
export function cartesAttendues(
  count: number,
  selection: Record<string, number>,
  variante: string,
) {
  return count + (selection["voleur"] && variante === "centre" ? 2 : 0);
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
