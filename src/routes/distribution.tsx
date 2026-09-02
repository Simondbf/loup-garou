import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useGame } from "@/lib/game-store";
import { Button, CampBadge, RoleSigil } from "@/components/ui-kit";
import { ROLES_BY_ID } from "@/data/roles";

export const Route = createFileRoute("/distribution")({
  head: () => ({
    meta: [
      { title: "Distribution des cartes — Loup-Garou" },
      {
        name: "description",
        content:
          "Faites tourner le téléphone : chaque joueur découvre sa carte en secret puis la referme.",
      },
      { property: "og:title", content: "Distribution des cartes — Loup-Garou" },
      {
        property: "og:description",
        content: "Le téléphone passe de main en main, chaque carte reste secrète.",
      },
    ],
  }),
  component: Distribution,
});

function Distribution() {
  const { state, hydrated, revealCurrent, nextPlayer, takeCenterCard } = useGame();
  const [ouverte, setOuverte] = useState(false);

  if (!hydrated) return null;

  if (!state.started || state.players.length === 0) {
    return (
      <Vide>
        Aucune partie en cours.{" "}
        <Link to="/nouvelle-partie" className="text-primary underline">
          Créer une partie
        </Link>
      </Vide>
    );
  }

  const termine = state.cursor >= state.players.length;

  if (termine) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-5 text-center">
        <div className="text-6xl">🌙</div>
        <h1 className="mt-5 text-3xl font-bold text-gradient-moon">
          Le village s'endort
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Toutes les cartes ont été distribuées. Le Maître du Jeu peut ouvrir son écran de
          contrôle et lancer la première nuit.
        </p>
        <Link to="/maitre" className="btn-base btn-primary mt-8 w-full">
          🎖️ Écran du Maître du Jeu
        </Link>
        <Link to="/" className="btn-base btn-ghost mt-3 w-full">
          Accueil
        </Link>
      </main>
    );
  }

  const player = state.players[state.cursor]!;
  const role = ROLES_BY_ID[player.roleId]!;
  const estVoleur = role.id === "voleur" && state.centerCards.length === 2;

  const suivant = () => {
    setOuverte(false);
    nextPlayer();
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pt-10 pb-10">
      <div className="mb-6 text-center">
        <p className="text-xs tracking-[0.3em] text-muted-foreground uppercase">
          Carte {state.cursor + 1} / {state.players.length}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gradient-moon">{player.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {ouverte ? "Mémorise ta carte, puis referme." : "Personne d'autre ne regarde ?"}
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center">
        {!ouverte ? (
          <button
            onClick={() => {
              revealCurrent();
              setOuverte(true);
            }}
            className="card-back flex aspect-[3/4.4] w-full max-w-[19rem] animate-glow flex-col items-center justify-center gap-4 rounded-3xl"
          >
            <span className="text-6xl">🌕</span>
            <span className="font-display text-lg font-bold tracking-wide">
              Toucher pour révéler
            </span>
            <span className="px-8 text-center text-xs text-muted-foreground">
              La carte reste visible tant que tu la gardes ouverte
            </span>
          </button>
        ) : (
          <div className="surface flex aspect-[3/4.4] w-full max-w-[19rem] animate-flip-in flex-col items-center gap-3 rounded-3xl p-4 text-center">
            <RoleArt role={role} className="min-h-0 flex-1" />
            <h2 className="font-display text-2xl font-black">{role.name}</h2>
            <CampBadge camp={role.camp} />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {role.description}
            </p>
          </div>

        )}
      </div>

      {ouverte && estVoleur && (
        <div className="surface mt-5 p-4">
          <p className="text-sm font-semibold">🗝️ Deux cartes au centre</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Choisis-en une : elle devient définitivement ton rôle.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {state.centerCards.map((cid, i) => {
              const c = ROLES_BY_ID[cid]!;
              return (
                <button
                  key={`${cid}-${i}`}
                  onClick={() => takeCenterCard(player.id, cid)}
                  className="rounded-xl border border-border bg-secondary p-3 text-center active:scale-[0.97]"
                >
                  <div className="text-3xl">{c.emoji}</div>
                  <div className="mt-1 text-xs font-semibold">{c.name}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6">
        {ouverte ? (
          <Button className="w-full py-4" onClick={suivant}>
            J'ai vu ma carte — joueur suivant →
          </Button>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            Passe le téléphone à {player.name}
          </p>
        )}
      </div>
    </main>
  );
}

function Vide({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6 text-center text-sm text-muted-foreground">
      <p>{children}</p>
    </main>
  );
}
