import { Link } from "@tanstack/react-router";
import { useState } from "react";

const ENTREES: { to: string; emoji: string; label: string; detail: string }[] = [
  { to: "/roles", emoji: "🃏", label: "Les cartes", detail: "Tous les rôles et leurs pouvoirs" },
  {
    to: "/compositions",
    emoji: "🧩",
    label: "Compositions",
    detail: "Préréglages selon le nombre de joueurs",
  },
  { to: "/regles", emoji: "📖", label: "Règles", detail: "Déroulé d'une nuit, d'un jour, du vote" },
];

/** Menu global : accessible depuis toutes les pages, en haut à droite. */
export function AppMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        className="fixed top-3 right-3 z-40 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card/80 text-lg backdrop-blur active:scale-95"
      >
        ☰
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-start justify-end bg-background/80 p-3 backdrop-blur-sm"
        >
          <nav
            onClick={(e) => e.stopPropagation()}
            className="surface animate-rise w-full max-w-xs p-3"
          >
            {ENTREES.map((e) => (
              <Link
                key={e.to}
                to={e.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl p-3 transition active:scale-[0.98]"
              >
                <span className="text-xl">{e.emoji}</span>
                <span className="min-w-0">
                  <span className="block font-display text-sm font-bold">{e.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{e.detail}</span>
                </span>
              </Link>
            ))}
            <button
              onClick={() => setOpen(false)}
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground"
            >
              Fermer
            </button>
          </nav>
        </div>
      )}
    </>
  );
}
