import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/lib/game-store";
import { LinkButton } from "@/components/ui-kit";
import { ROLES } from "@/data/roles";
import { COMPOSITIONS } from "@/data/compositions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lune Rousse — Loup-Garou sur mobile, un ou plusieurs téléphones" },
      {
        name: "description",
        content:
          "Distribuez les rôles de Loup-Garou : un seul téléphone qui tourne, un téléphone par joueur ou un mélange des deux, grâce à un code de partie.",
      },
      { property: "og:title", content: "Lune Rousse — jeu de Loup-Garou" },
      {
        property: "og:description",
        content:
          "Compositions conseillées, cartes secrètes et tableau de bord du Maître du Jeu.",
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
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-14 pb-12">
      <div className="animate-rise text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 animate-glow items-center justify-center rounded-full border border-primary/30 bg-card text-5xl">
          🌕
        </div>
        <p className="text-xs tracking-[0.35em] text-muted-foreground uppercase">Les nuits de</p>
        <h1 className="mt-2 text-4xl font-black text-gradient-moon">Lune Rousse</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Le Maître du Jeu crée la partie et donne un code. Les joueurs rejoignent avec leur
          téléphone — seuls, à deux ou à plusieurs sur le même appareil.
        </p>
      </div>

      <div className="mt-9 flex flex-col gap-3">
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

      <div className="mt-8 grid grid-cols-2 gap-3">
        <Tuile to="/roles" emoji="🃏" titre="Les cartes" valeur={`${ROLES.length} rôles`} />
        <Tuile
          to="/compositions"
          emoji="🧩"
          titre="Compositions"
          valeur={`${COMPOSITIONS.length} préréglages`}
        />
        <Tuile to="/regles" emoji="📖" titre="Règles" valeur="Déroulé d'une nuit" />
        <Tuile to="/rejoindre" emoji="📱" titre="Téléphone partagé" valeur="1 à 6 joueurs" />
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        7 joueurs minimum · le Maître du Jeu garde son téléphone pour lui
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
      className="surface flex flex-col gap-1 p-4 text-left transition active:scale-[0.97]"
    >
      <span className="text-2xl">{emoji}</span>
      <span className="font-display font-bold">{titre}</span>
      <span className="text-xs text-muted-foreground">{valeur}</span>
    </Link>
  );
}
