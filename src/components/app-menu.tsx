import { useState } from "react";
import { RolesPanel } from "@/components/panels/roles-panel";
import { CompositionsPanel } from "@/components/panels/compositions-panel";
import { ReglesPanel } from "@/components/panels/regles-panel";

type Vue = "menu" | "roles" | "compositions" | "regles";

const ENTREES: { vue: Vue; emoji: string; label: string; detail: string }[] = [
  { vue: "roles", emoji: "🃏", label: "Les cartes", detail: "Tous les rôles et leurs pouvoirs" },
  {
    vue: "compositions",
    emoji: "🧩",
    label: "Compositions",
    detail: "Préréglages selon le nombre de joueurs",
  },
  { vue: "regles", emoji: "📖", label: "Règles", detail: "Déroulé d'une nuit, d'un jour, du vote" },
];

const TITRES: Record<Exclude<Vue, "menu">, string> = {
  roles: "Les cartes",
  compositions: "Compositions",
  regles: "Les règles",
};

/**
 * Menu global superposé : il ne quitte jamais la page en cours,
 * de sorte qu'une création de partie n'est pas perdue.
 */
export function AppMenu() {
  const [vue, setVue] = useState<Vue | null>(null);

  return (
    <>
      <button
        onClick={() => setVue("menu")}
        aria-label="Ouvrir le menu"
        className="fixed top-3 right-3 z-40 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card/80 text-lg backdrop-blur active:scale-95"
      >
        ☰
      </button>

      {vue === "menu" && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setVue(null)}
          className="fixed inset-0 z-50 flex items-start justify-end bg-background/80 p-3 backdrop-blur-sm"
        >
          <nav
            onClick={(e) => e.stopPropagation()}
            className="surface animate-rise w-full max-w-xs p-3"
          >
            {ENTREES.map((e) => (
              <button
                key={e.vue}
                onClick={() => setVue(e.vue)}
                className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition active:scale-[0.98]"
              >
                <span className="text-xl">{e.emoji}</span>
                <span className="min-w-0">
                  <span className="block font-display text-sm font-bold">{e.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{e.detail}</span>
                </span>
              </button>
            ))}
            <button
              onClick={() => setVue(null)}
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground"
            >
              Fermer
            </button>
          </nav>
        </div>
      )}

      {vue && vue !== "menu" && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-background/98">
          <div className="mx-auto flex h-full w-full max-w-md flex-col">
            <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
              <button
                onClick={() => setVue("menu")}
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                ← Retour
              </button>
              <span className="font-display font-bold">{TITRES[vue]}</span>
              <button
                onClick={() => setVue(null)}
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                Fermer
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {vue === "roles" && <RolesPanel />}
              {vue === "compositions" && <CompositionsPanel />}
              {vue === "regles" && <ReglesPanel />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
