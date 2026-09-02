import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit";
import { CompositionsPanel } from "@/components/panels/compositions-panel";

export const Route = createFileRoute("/compositions")({
  head: () => ({
    meta: [
      { title: "Compositions conseillées — Loup-Garou" },
      {
        name: "description",
        content:
          "Des compositions de cartes équilibrées pour 7 à 18 joueurs, du village de découverte à la nuit de chaos.",
      },
      { property: "og:title", content: "Compositions conseillées — Loup-Garou" },
      {
        property: "og:description",
        content: "Quelles cartes mettre selon le nombre de joueurs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Compositions,
});

function Compositions() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-10 pb-16">
      <PageHeader
        title="Compositions"
        subtitle="Des villages prêts à jouer selon le nombre de joueurs. Sélectionnables en un tap lors de la création d'une partie."
        back="/"
      />
      <CompositionsPanel />
    </main>
  );
}
