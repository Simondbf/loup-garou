import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui-kit";
import { COMPOSITIONS } from "@/data/compositions";
import { ROLES_BY_ID } from "@/data/roles";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/compositions")({
  head: () => ({
    meta: [
      { title: "Compositions conseillées — Loup-Garou" },
      {
        name: "description",
        content:
          "Des compositions de cartes équilibrées pour 6 à 18 joueurs, du village de découverte à la nuit de chaos.",
      },
      { property: "og:title", content: "Compositions conseillées — Loup-Garou" },
      {
        property: "og:description",
        content: "Quelles cartes mettre selon le nombre de joueurs.",
      },
    ],
  }),
  component: Compositions,
});

function Compositions() {
  const counts = useMemo(
    () => [...new Set(COMPOSITIONS.map((c) => c.players))].sort((a, b) => a - b),
    [],
  );
  const [filtre, setFiltre] = useState<number | null>(null);
  const liste = COMPOSITIONS.filter((c) => filtre === null || c.players === filtre);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-10 pb-16">
      <PageHeader
        title="Compositions"
        subtitle="Des villages prêts à jouer selon le nombre de joueurs. Sélectionnables en un tap lors de la création d'une partie."
        back="/"
      />

      <div className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-1">
        <Chip active={filtre === null} onClick={() => setFiltre(null)}>
          Toutes
        </Chip>
        {counts.map((n) => (
          <Chip key={n} active={filtre === n} onClick={() => setFiltre(n)}>
            {n} joueurs
          </Chip>
        ))}
      </div>

      <ul className="flex flex-col gap-3">
        {liste.map((c) => (
          <li key={c.id} className="surface p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-lg font-bold">{c.name}</span>
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                {c.difficulty}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {c.players} joueurs · {c.description}
            </p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {Object.entries(c.roles).map(([id, q]) => (
                <li
                  key={id}
                  className="rounded-lg border border-border bg-secondary px-2 py-1 text-xs"
                >
                  {ROLES_BY_ID[id]?.emoji} {ROLES_BY_ID[id]?.name ?? id}
                  {q > 1 ? ` ×${q}` : ""}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </main>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold",
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border bg-secondary text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
