import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useGame } from "@/lib/game-store";
import { Button, CampBadge, Modal, RoleDetail, RoleSigil } from "@/components/ui-kit";
import { ROLES_BY_ID, type Role } from "@/data/roles";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/maitre")({
  head: () => ({
    meta: [
      { title: "Maître du Jeu — Loup-Garou" },
      {
        name: "description",
        content:
          "Tableau de bord du Maître du Jeu : rôle de chaque joueur, ordre de réveil de la nuit et suivi des morts.",
      },
      { property: "og:title", content: "Maître du Jeu — Loup-Garou" },
      {
        property: "og:description",
        content: "Toutes les cartes, l'ordre de la nuit et le suivi des éliminations.",
      },
    ],
  }),
  component: Maitre,
});

function Maitre() {
  const { state, hydrated, toggleAlive, reset } = useGame();
  const [masque, setMasque] = useState(true);
  const [detail, setDetail] = useState<Role | null>(null);
  const [onglet, setOnglet] = useState<"joueurs" | "nuit">("joueurs");

  const nuit = useMemo(() => {
    const ids = new Set(state.players.map((p) => p.roleId));
    return [...ids]
      .map((id) => ROLES_BY_ID[id]!)
      .filter((r) => r && r.wakeOrder)
      .sort((a, b) => (a.wakeOrder ?? 99) - (b.wakeOrder ?? 99));
  }, [state.players]);

  const vivants = state.players.filter((p) => p.alive);
  const loupsVivants = vivants.filter((p) => ROLES_BY_ID[p.roleId]?.camp === "loups").length;

  if (!hydrated) return null;

  if (!state.started || state.players.length === 0) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-muted-foreground">Aucune partie en cours.</p>
        <Link to="/nouvelle-partie" className="btn-base btn-primary">
          Créer une partie
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-10 pb-28">
      <Link
        to="/"
        className="mb-3 inline-flex text-sm text-muted-foreground hover:text-primary"
      >
        ← Accueil
      </Link>
      <h1 className="text-3xl font-bold text-gradient-moon">Maître du Jeu</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {vivants.length} vivants · {loupsVivants} loup{loupsVivants > 1 ? "s" : ""} encore en
        vie
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
        {(["joueurs", "nuit"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setOnglet(t)}
            className={cn(
              "rounded-lg py-2 text-sm font-semibold capitalize transition-colors",
              onglet === t ? "bg-primary/20 text-primary" : "text-muted-foreground",
            )}
          >
            {t === "joueurs" ? "Joueurs" : "Déroulé de la nuit"}
          </button>
        ))}
      </div>

      {onglet === "joueurs" ? (
        <>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {masque ? "Rôles masqués" : "Rôles visibles"}
            </span>
            <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => setMasque(!masque)}>
              {masque ? "👁️ Afficher" : "🙈 Masquer"}
            </Button>
          </div>

          <ul className="mt-3 flex flex-col gap-2">
            {state.players.map((p) => {
              const role = ROLES_BY_ID[p.roleId]!;
              return (
                <li
                  key={p.id}
                  className={cn(
                    "surface flex items-center gap-3 p-3",
                    !p.alive && "opacity-45 grayscale",
                  )}
                >
                  {masque ? (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-secondary text-2xl">
                      ❔
                    </div>
                  ) : (
                    <button onClick={() => setDetail(role)}>
                      <RoleSigil role={role} />
                    </button>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display font-bold">{p.name}</p>
                    {masque ? (
                      <p className="text-xs text-muted-foreground">Rôle caché</p>
                    ) : (
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="truncate text-xs">{role.name}</span>
                        <CampBadge camp={role.camp} />
                      </div>
                    )}
                    {p.stolenFrom && !masque && (
                      <p className="text-[11px] text-primary">carte prise à {p.stolenFrom}</p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleAlive(p.id)}
                    className={cn(
                      "rounded-lg px-3 py-2 text-xs font-semibold",
                      p.alive ? "bg-secondary" : "bg-destructive/20 text-destructive",
                    )}
                  >
                    {p.alive ? "Tuer" : "Ranimer"}
                  </button>
                </li>
              );
            })}
          </ul>

          {state.centerCards.length > 0 && (
            <div className="surface mt-4 p-4">
              <p className="text-sm font-semibold">🗝️ Cartes au centre</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {masque
                  ? "Masquées"
                  : state.centerCards.map((c) => ROLES_BY_ID[c]?.name).join(" · ")}
              </p>
            </div>
          )}
        </>
      ) : (
        <ol className="mt-4 flex flex-col gap-2">
          <li className="surface p-4 text-sm">
            <span className="font-display font-bold">Le village s'endort</span>
            <p className="mt-1 text-xs text-muted-foreground">
              Annoncez : « La nuit tombe sur Thiercelieux, tout le monde ferme les yeux. »
            </p>
          </li>
          {nuit.map((r, i) => (
            <li key={r.id} className="surface flex items-start gap-3 p-3">
              <span className="mt-1 w-5 text-center text-xs text-primary">{i + 1}</span>
              <button onClick={() => setDetail(r)} className="flex-1 text-left">
                <span className="font-display font-bold">
                  {r.emoji} {r.name}
                </span>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.short}</p>
              </button>
            </li>
          ))}
          <li className="surface p-4 text-sm">
            <span className="font-display font-bold">Le jour se lève</span>
            <p className="mt-1 text-xs text-muted-foreground">
              Annoncez les morts, laissez le débat, puis le vote du village.
            </p>
          </li>
        </ol>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)}>
        {detail && <RoleDetail role={detail} onClose={() => setDetail(null)} />}
      </Modal>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 px-5 pt-3 pb-6 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md gap-2">
          <Link to="/distribution" className="btn-base btn-ghost flex-1">
            🎴 Distribution
          </Link>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm("Terminer la partie et effacer les rôles ?")) reset();
            }}
          >
            Terminer
          </Button>
        </div>
      </div>
    </main>
  );
}
