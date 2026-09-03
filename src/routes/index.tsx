import { createFileRoute } from "@tanstack/react-router";
import { useGame } from "@/lib/game-store";
import { LinkButton } from "@/components/ui-kit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Les Nuits de Thiercelieux — Loup-Garou sur mobile" },
      {
        name: "description",
        content:
          "Distribuez les rôles de Loup-Garou : un seul téléphone qui tourne, un téléphone par joueur ou un mélange des deux, grâce à un code de partie.",
      },
      { property: "og:title", content: "Les Nuits de Thiercelieux — jeu de Loup-Garou" },
      {
        property: "og:description",
        content: "Cartes secrètes, conduite de la nuit et tableau de bord du Maître du Jeu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Accueil,
});

function Accueil() {
  const { hydrated, session, game } = useGame();
  const reprise = hydrated && session && game && game.status !== "ended";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-16">
      <div className="animate-rise text-center">
        <div className="mx-auto mb-7 flex h-24 w-24 animate-glow items-center justify-center rounded-full border border-primary/30 bg-card text-5xl">
          🌕
        </div>
        <p className="text-xs tracking-[0.35em] text-muted-foreground uppercase">Les nuits de</p>
        <h1 className="mt-2 text-4xl font-black text-gradient-moon">Thiercelieux</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Le Maître du Jeu crée la partie et donne un code. Les joueurs rejoignent avec leur
          téléphone — seuls, à deux ou à plusieurs sur le même appareil.
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-3">
        {reprise && (
          <LinkButton
            to={session!.host ? "/maitre" : "/distribution"}
            className="w-full py-4 text-base"
          >
            ↩️ Reprendre la partie {game!.code}
          </LinkButton>
        )}
        <LinkButton
          to="/nouvelle-partie"
          variant={reprise ? "ghost" : "primary"}
          className="w-full py-4 text-base"
        >
          🎖️ Créer une partie (Maître du Jeu)
        </LinkButton>
        <LinkButton to="/rejoindre" variant="ghost" className="w-full py-4 text-base">
          🔑 Rejoindre avec un code
        </LinkButton>
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        7 joueurs minimum · cartes et règles dans le menu ☰
      </p>
      <p className="mt-4 text-center text-[10px] leading-relaxed text-muted-foreground/70">
        Application fortement inspirée, mais sans aucun lien, du jeu des Loups-Garous de
        Thiercelieux créé par Philippe des Pallières et Hervé Marly.
      </p>
    </main>
  );
}
