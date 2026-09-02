import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

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
    ],
  }),
  component: Regles,
});

const SECTIONS = [
  {
    titre: "🌘 Le but du jeu",
    contenu: [
      "Le village est infesté de Loups-Garous. Chaque nuit, ils dévorent un habitant ; chaque jour, le village tente d'en démasquer un et de l'exécuter.",
      "Le camp du Village gagne quand tous les Loups-Garous sont morts. Le camp des Loups gagne quand il ne reste plus aucun villageois. Les rôles solitaires (Loup Blanc, Joueur de Flûte, Ange…) ont leur propre condition de victoire.",
    ],
  },
  {
    titre: "🎴 Mise en place",
    contenu: [
      "Choisissez le nombre de joueurs (le Maître du Jeu ne joue pas) puis la composition des cartes.",
      "Faites tourner le téléphone : chaque joueur ouvre sa carte seul, la mémorise, la referme et passe l'appareil.",
      "Le Maître du Jeu garde ensuite le téléphone : son écran liste tous les rôles et l'ordre de réveil.",
    ],
  },
  {
    titre: "🌙 La nuit",
    contenu: [
      "« Le village s'endort, tout le monde ferme les yeux. »",
      "Le Maître du Jeu appelle les rôles un par un, dans l'ordre indiqué sur son écran : Voleur et Cupidon la première nuit seulement, puis Salvateur, Voyante, Loups-Garous, Sorcière, etc.",
      "Chaque joueur appelé ouvre les yeux, agit en silence, puis les referme.",
    ],
  },
  {
    titre: "☀️ Le jour",
    contenu: [
      "Le Maître du Jeu annonce les victimes de la nuit. Les morts révèlent leur carte et ne parlent plus.",
      "Le village débat, s'accuse, se défend. Puis vient le vote : à main levée, le joueur qui réunit le plus de voix est exécuté.",
      "En cas d'égalité : nouveau vote entre les ex æquo, ou intervention du Capitaine / du Bouc Émissaire si ces rôles sont en jeu.",
    ],
  },
  {
    titre: "🎖️ Le Capitaine",
    contenu: [
      "Avant la première nuit, le village élit un Capitaine. Son vote compte double et il tranche les égalités.",
      "Quand il meurt, il désigne immédiatement son successeur — c'est souvent le moment le plus stratégique de la partie.",
    ],
  },
  {
    titre: "🗝️ Le Voleur",
    contenu: [
      "Deux cartes supplémentaires sont mises au centre. L'application les gère automatiquement dès que le Voleur est dans la composition.",
      "La première nuit, le Voleur voit ces deux cartes sur son écran et peut en prendre une : ce rôle devient définitivement le sien.",
      "S'il tombe sur deux Loups-Garous, il est obligé d'en prendre un.",
      "Variante « Voleur d'Identité » : il échange définitivement sa carte avec celle d'un joueur, les deux sont prévenus par le Maître du Jeu.",
    ],
  },
  {
    titre: "❤️ Les Amoureux",
    contenu: [
      "Cupidon désigne deux Amoureux la première nuit. Si l'un meurt, l'autre le suit aussitôt.",
      "Si les deux Amoureux sont de camps opposés, ils forment un troisième camp : ils ne gagnent que s'ils sont les deux derniers survivants.",
    ],
  },
  {
    titre: "🚨 Le Garde Champêtre",
    contenu: [
      "Il agit en toute fin de nuit, après tous les autres rôles : il désigne au Maître du Jeu un joueur qui ne pourra pas prendre la parole pendant le débat du lendemain.",
      "Le joueur bâillonné conserve son droit de vote et peut communiquer par gestes, mimiques ou hochements de tête — mais il ne prononce aucun mot et n'écrit rien.",
      "Le Garde Champêtre ne peut pas re-désigner une même personne : elle redevient une cible possible seulement après trois nuits.",
    ],
  },
];

function Regles() {
  const [ouvert, setOuvert] = useState<number | null>(0);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-10 pb-16">
      <PageHeader
        title="Les règles"
        subtitle="Le déroulé complet d'une partie, à garder sous la main pendant le jeu."
        back="/"
      />

      <div className="flex flex-col gap-2">
        {SECTIONS.map((s, i) => (
          <div key={s.titre} className="surface overflow-hidden">
            <button
              onClick={() => setOuvert(ouvert === i ? null : i)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left"
            >
              <span className="font-display font-bold">{s.titre}</span>
              <span
                className={cn(
                  "text-primary transition-transform",
                  ouvert === i && "rotate-180",
                )}
              >
                ▾
              </span>
            </button>
            {ouvert === i && (
              <div className="animate-rise space-y-2 border-t border-border px-4 pt-3 pb-4">
                {s.contenu.map((p) => (
                  <p key={p} className="text-sm leading-relaxed text-muted-foreground">
                    {p}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
