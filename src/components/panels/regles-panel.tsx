import { useState } from "react";
import { cn } from "@/lib/utils";

export const SECTIONS = [
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
      "Le Maître du Jeu appelle les rôles un par un, dans l'ordre affiché sur son écran. Chaque joueur appelé ouvre les yeux, agit en silence, puis les referme.",
      "Certains rôles n'interviennent que lors de la toute première nuit : ils sont signalés comme tels sur l'écran du Maître du Jeu.",
      "Le Garde Champêtre est toujours le dernier appelé, juste avant le lever du jour.",
    ],
  },
  {
    titre: "☀️ Le jour",
    contenu: [
      "Le Maître du Jeu annonce les victimes de la nuit. Les morts révèlent leur carte et ne parlent plus.",
      "Le premier jour commence par l'élection du Capitaine, avant le débat.",
      "Le village débat, s'accuse, se défend. Puis vient le vote : à main levée, le joueur qui réunit le plus de voix est exécuté.",
      "En cas d'égalité : nouveau vote entre les ex æquo, ou intervention du Capitaine / du Bouc Émissaire si ces rôles sont en jeu.",
    ],
  },
  {
    titre: "🎖️ Le Capitaine",
    contenu: [
      "Le Capitaine est élu par le village au cours de la première journée, après la première nuit.",
      "Son vote compte double et il tranche les égalités.",
      "Quand il meurt, il désigne immédiatement son successeur — c'est souvent le moment le plus stratégique de la partie.",
    ],
  },
  {
    titre: "🗝️ Le Voleur",
    contenu: [
      "Deux variantes, choisies à la création de la partie.",
      "Cartes au centre : deux cartes supplémentaires sont mises de côté. La première nuit, le Voleur en découvre une et la prend définitivement. Face à deux Loups-Garous, il est obligé d'en prendre un.",
      "Échange : le Voleur est appelé chaque nuit et échange sa carte avec celle du joueur de son choix ; les deux découvrent leur nouveau rôle. Cette variante est déconseillée quand la table ne dispose que d'un seul téléphone, car tout le monde doit revérifier sa carte chaque matin.",
    ],
  },

  {
    titre: "❤️ Les Amoureux",
    contenu: [
      "Cupidon désigne deux Amoureux la première nuit. Dès qu'il s'est rendormi, le Maître du Jeu réveille les deux Amoureux pour qu'ils se reconnaissent.",
      "Si l'un meurt, l'autre le suit aussitôt. S'ils sont de camps opposés, ils forment un troisième camp : ils ne gagnent que s'ils sont les deux derniers survivants.",
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

/** Contenu des règles : réutilisé par la route /regles et par le menu superposé. */
export function ReglesPanel() {
  const [ouvert, setOuvert] = useState<number | null>(0);

  return (
    <div className="flex flex-col gap-2">
      {SECTIONS.map((s, i) => (
        <div key={s.titre} className="surface overflow-hidden">
          <button
            onClick={() => setOuvert(ouvert === i ? null : i)}
            className="flex w-full items-center justify-between gap-3 p-4 text-left"
          >
            <span className="font-display font-bold">{s.titre}</span>
            <span className={cn("text-primary transition-transform", ouvert === i && "rotate-180")}>
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
  );
}
