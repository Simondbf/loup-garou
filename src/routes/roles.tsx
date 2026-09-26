import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit";
import { RolesPanel } from "@/components/panels/roles-panel";
import { ROLES } from "@/data/roles";

export const Route = createFileRoute("/roles")({
  head: () => ({
    meta: [
      { title: "Toutes les cartes du Loup-Garou et leurs pouvoirs" },
      {
        name: "description",
        content:
          "Le pouvoir de chaque carte du jeu : loups, villageois, camps inconnus et solitaires.",
      },
      { property: "og:title", content: "Toutes les cartes du Loup-Garou" },
      {
        property: "og:description",
        content: "Description complète du pouvoir de chaque rôle, camp par camp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Roles,
});

function Roles() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-10 pb-16">
      <PageHeader
        title="Les cartes"
        subtitle={`${ROLES.length} rôles, tous camps confondus. Touchez une carte pour lire son pouvoir.`}
        back="/"
      />
      <RolesPanel />
    </main>
  );
}
