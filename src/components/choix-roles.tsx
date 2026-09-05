import { CAMP_LABEL, type Camp, type Role } from "@/data/roles";
import { ajusterRole } from "@/data/composition";

/**
 * Le choix des cartes, où qu'il se fasse.
 *
 * Le même écran sert à la création d'une partie sur un seul téléphone et au
 * salon multi-téléphones, où la composition ne se décide qu'une fois le
 * village au complet. Deux présentations différentes pour un même geste
 * n'auraient servi qu'à dérouter.
 *
 * L'ordre des camps est celui du livret : la meute, le village, les
 * ambigus, les solitaires.
 */

const CAMPS: Camp[] = ["loups", "villageois", "ambigu", "solitaire"];

export function ChoixRoles({
  pioche,
  selection,
  onSelection,
  onDetail,
}: {
  pioche: Role[];
  selection: Record<string, number>;
  onSelection: (selection: Record<string, number>) => void;
  onDetail: (role: Role) => void;
}) {
  return (
    <>
      {CAMPS.map((camp) => {
        const duCamp = pioche.filter((r) => r.camp === camp);
        if (duCamp.length === 0) return null;
        return (
          <div key={camp} className="mb-5">
            <h2 className="mb-2 text-xs tracking-widest text-muted-foreground uppercase">
              {CAMP_LABEL[camp]}
            </h2>
            <ul className="flex flex-col gap-2">
              {duCamp.map((role) => {
                const n = selection[role.id] ?? 0;
                return (
                  <li key={role.id} className="surface p-2.5">
                    <div className="flex items-center gap-3">
                      <button className="min-w-0 flex-1 text-left" onClick={() => onDetail(role)}>
                        <span className="block truncate text-sm font-semibold">{role.name}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {role.short}
                        </span>
                      </button>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onSelection(ajusterRole(selection, role.id, -1))}
                          disabled={n === 0}
                          className="btn-base btn-ghost h-8 w-8 p-0 disabled:opacity-30"
                          aria-label={`Retirer un ${role.name}`}
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-sm font-semibold tabular-nums">
                          {n}
                        </span>
                        <button
                          onClick={() => onSelection(ajusterRole(selection, role.id, 1))}
                          className="btn-base btn-ghost h-8 w-8 p-0"
                          aria-label={`Ajouter un ${role.name}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </>
  );
}
