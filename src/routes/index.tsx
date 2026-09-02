import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/lib/game-store";
import { LinkButton } from "@/components/ui-kit";
import { ROLES } from "@/data/roles";
import { COMPOSITIONS } from "@/data/compositions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Loup-Garou — Distribuez les cartes sur un seul téléphone" },
      {
        name: "description",
        content:
          "Application Loup-Garou de Thiercelieux : toutes les extensions, compositions conseillées, écran Maître du Jeu et règles de chaque carte.",
      },
      { property: "og:title", content: "Loup-Garou — Maître du Jeu" },
      {
        property: "og:description",
        content:
          "Choisissez vos joueurs, vos cartes et faites tourner le téléphone. Toutes les extensions incluses.",
      },
    ],
  }),
  component: Accueil,
});

function Accueil() {
  const { state, hydrated } = useGame();
  const partieEnCours = hydrated && state.started && state.players.length > 0;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-14 pb-12">
      <div className="text-center animate-rise">
        <div className="mx-auto mb-6 flex h-24 w-24 animate-glow items-center justify-center rounded-full border border-primary/30 bg-card text-5xl">
          🌕
        </div>
        <p className="text-xs tracking-[0.35em] text-muted-foreground uppercase">
          Les nuits de
        </p>
        <h1 className="mt-2 text-4xl font-black text-gradient-moon">Thiercelieux</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Un seul téléphone, tout le village. Composez la partie, faites tourner
          l'appareil, chacun découvre sa carte en secret.
        </p>
      </div>

      <div className="mt-9 flex flex-col gap-3">
        {partieEnCours && (
          <LinkButton to="/maitre" className="w-full py-4 text-base">
            🎖️ Reprendre la partie en cours
          </LinkButton>
        )}
        <LinkButton
          to="/nouvelle-partie"
          variant={partieEnCours ? "ghost" : "primary"}
          className="w-full py-4 text-base"
        >
          🐺 Nouvelle partie
        </LinkButton>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <Tuile to="/roles" emoji="🃏" titre="Les cartes" valeur={`${ROLES.length} rôles`} />
        <Tuile
          to="/compositions"
          emoji="🧩"
          titre="Compositions"
          valeur={`${COMPOSITIONS.length} préréglages`}
        />
        <Tuile to="/regles" emoji="📖" titre="Règles" valeur="Déroulé d'une nuit" />
        <Tuile to="/maitre" emoji="🎖️" titre="Maître du jeu" valeur="Vue complète" />
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Jeu de base · Nouvelle Lune · Personnages · Le Village · Le Pacte
      </p>
    </main>
  );
}

function Tuile({
  to,
  emoji,
  titre,
  valeur,
}: {
  to: string;
  emoji: string;
  titre: string;
  valeur: string;
}) {
  return (
    <Link
      to={to}
      className="surface flex flex-col gap-1 p-4 transition-transform active:scale-[0.97]"
    >
      <span className="text-2xl">{emoji}</span>
      <span className="font-display text-sm font-bold">{titre}</span>
      <span className="text-xs text-muted-foreground">{valeur}</span>
    </Link>
  );
}
