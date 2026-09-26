import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit";
import { ReglesPanel } from "@/components/panels/regles-panel";

export const Route = createFileRoute("/regles")({
  head: () => ({
    meta: [
      { title: "Règles du Loup-Garou de Thiercelieux" },
      {
        name: "description",
        content:
          "Déroulé d'une partie de Loup-Garou : la nuit, le jour, le vote, le Capitaine et les conditions de victoire de chaque camp.",
      },
      { property: "og:title", content: "Règles du Loup-Garou" },
      {
        property: "og:description",
        content: "Nuit, jour, vote, Capitaine et victoire : tout le déroulé d'une partie.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Regles,
});

function Regles() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-10 pb-16">
      <PageHeader
        title="Les règles"
        subtitle="Le déroulé complet d'une partie, à garder sous la main pendant le jeu."
        back="/"
      />
      <ReglesPanel />
    </main>
  );
}
