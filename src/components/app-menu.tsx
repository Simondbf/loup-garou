import { useState } from "react";
import { RolesPanel } from "@/components/panels/roles-panel";
import { ReglesPanel } from "@/components/panels/regles-panel";
import { useConseils } from "@/lib/conseils";
import { useTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

type Vue = "menu" | "roles" | "regles";

const ENTREES: { vue: Vue; emoji: string; label: string; detail: string }[] = [
  { vue: "roles", emoji: "🃏", label: "Les cartes", detail: "Tous les rôles et leurs pouvoirs" },
  { vue: "regles", emoji: "📖", label: "Règles", detail: "Déroulé d'une nuit, d'un jour, du vote" },
];

const TITRES: Record<Exclude<Vue, "menu">, string> = {
  roles: "Les cartes",
  regles: "Les règles",
};

/**
 * Menu global superposé : il ne quitte jamais la page en cours,
 * de sorte qu'une création de partie n'est pas perdue.
 */
export function AppMenu() {
  const [vue, setVue] = useState<Vue | null>(null);
  const { theme, setTheme } = useTheme();
  const { conseils, setConseils } = useConseils();

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
            <div className="mt-6">
              <p className="mb-2 text-xs tracking-widest text-muted-foreground uppercase">
                Apparence
              </p>
              <div className="flex gap-1 rounded-xl bg-secondary p-1">
                {(
                  [
                    ["sombre", "🌙 Sombre"],
                    ["clair", "☀️ Clair"],
                    ["appareil", "📱 Appareil"],
                  ] as [Theme, string][]
                ).map(([valeur, label]) => (
                  <button
                    key={valeur}
                    onClick={() => setTheme(valeur)}
                    className={cn(
                      "flex-1 rounded-lg px-2 py-2 text-[11px] font-semibold transition",
                      theme === valeur ? "bg-card text-primary shadow-sm" : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="mb-2 text-xs tracking-widest text-muted-foreground uppercase">
                Maître du Jeu
              </p>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-secondary p-3">
                <input
                  type="checkbox"
                  checked={conseils}
                  onChange={(e) => setConseils(e.target.checked)}
                  className="h-5 w-5 shrink-0 accent-primary"
                />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold">Conseils pendant la partie</span>
                  <span className="block text-[11px] text-muted-foreground">
                    Rappels de règle sous chaque étape. La description du rôle affiché reste
                    accessible par le bouton « ? Aide ».
                  </span>
                </span>
              </label>
            </div>

            <button
              onClick={() => setVue(null)}
              className="mt-4 w-full rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground"
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
              {vue === "regles" && <ReglesPanel />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
