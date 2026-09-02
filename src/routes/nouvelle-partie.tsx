import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useGame } from "@/lib/game-store";
import {
  Button,
  CampBadge,
  Modal,
  PageHeader,
  RoleDetail,
  RoleSigil,
} from "@/components/ui-kit";
import {
  EXTENSION_LABEL,
  ROLES,
  ROLES_BY_ID,
  type Extension,
  type Role,
} from "@/data/roles";
import { compositionsFor, suggestedWolves } from "@/data/compositions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/nouvelle-partie")({
  head: () => ({
    meta: [
      { title: "Nouvelle partie — Loup-Garou" },
      {
        name: "description",
        content:
          "Choisissez le nombre de joueurs, saisissez les prénoms et composez votre village parmi toutes les extensions.",
      },
      { property: "og:title", content: "Nouvelle partie — Loup-Garou" },
      {
        property: "og:description",
        content: "Joueurs, prénoms et composition des cartes en trois étapes.",
      },
    ],
  }),
  component: NouvellePartie,
});

const EXTENSIONS: Extension[] = [
  "base",
  "nouvelle-lune",
  "personnages",
  "village",
  "pacte",
  "bonus",
];

function NouvellePartie() {
  const [etape, setEtape] = useState(0);
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-10 pb-32">
      <PageHeader
        title={etape === 0 ? "Les joueurs" : "La composition"}
        subtitle={
          etape === 0
            ? "Combien êtes-vous ? Le Maître du Jeu ne compte pas comme joueur."
            : "Choisissez une composition conseillée ou piochez carte par carte."
        }
        back="/"
      />
      {etape === 0 ? (
        <EtapeJoueurs onNext={() => setEtape(1)} />
      ) : (
        <EtapeCartes onBack={() => setEtape(0)} />
      )}
    </main>
  );
}

function EtapeJoueurs({ onNext }: { onNext: () => void }) {
  const { state, setPlayerCount, setName } = useGame();
  const n = state.playerCount;

  return (
    <>
      <section className="surface p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Nombre de joueurs</span>
          <span className="font-display text-4xl font-black text-primary">{n}</span>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button variant="ghost" onClick={() => setPlayerCount(n - 1)} aria-label="Moins">
            −
          </Button>
          <input
            type="range"
            min={4}
            max={24}
            value={n}
            onChange={(e) => setPlayerCount(Number(e.target.value))}
            className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-secondary accent-[oklch(0.82_0.14_78)]"
          />
          <Button variant="ghost" onClick={() => setPlayerCount(n + 1)} aria-label="Plus">
            +
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Conseil : {suggestedWolves(n)} loups pour {n} joueurs.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Prénoms
        </h2>
        <div className="flex flex-col gap-2">
          {Array.from({ length: n }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-7 text-right text-sm text-muted-foreground">{i + 1}</span>
              <input
                value={state.names[i] ?? ""}
                onChange={(e) => setName(i, e.target.value)}
                placeholder={`Joueur ${i + 1}`}
                className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </div>
          ))}
        </div>
      </section>

      <BarreBas>
        <Button className="w-full" onClick={onNext}>
          Choisir les cartes →
        </Button>
      </BarreBas>
    </>
  );
}

function EtapeCartes({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const { state, addRole, removeRole, setSelection, totalSelected, deal } = useGame();
  const [ext, setExt] = useState<Extension>("base");
  const [detail, setDetail] = useState<Role | null>(null);

  const compos = useMemo(() => compositionsFor(state.playerCount), [state.playerCount]);
  const cible = state.playerCount + (state.selection["voleur"] ? 2 : 0);
  const manque = cible - totalSelected;
  const loups = useMemo(
    () =>
      Object.entries(state.selection).reduce(
        (acc, [id, count]) => acc + (ROLES_BY_ID[id]?.camp === "loups" ? count : 0),
        0,
      ),
    [state.selection],
  );

  const lancer = () => {
    deal();
    navigate({ to: "/distribution" });
  };

  return (
    <>
      {compos.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Compositions conseillées à {state.playerCount}
          </h2>
          <div className="flex flex-col gap-2">
            {compos.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelection({ ...c.roles })}
                className="surface p-4 text-left transition-transform active:scale-[0.98]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display font-bold">{c.name}</span>
                  <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                    {c.difficulty}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>
                <p className="mt-2 text-xs">
                  {Object.entries(c.roles)
                    .map(([id, q]) => `${ROLES_BY_ID[id]?.emoji ?? ""} ${ROLES_BY_ID[id]?.name ?? id}${q > 1 ? ` ×${q}` : ""}`)
                    .join(" · ")}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-1">
          {EXTENSIONS.map((e) => (
            <button
              key={e}
              onClick={() => setExt(e)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
                ext === e
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-secondary text-muted-foreground",
              )}
            >
              {EXTENSION_LABEL[e]}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {ROLES.filter((r) => r.extension === ext).map((role) => {
            const q = state.selection[role.id] ?? 0;
            return (
              <div
                key={role.id}
                className={cn(
                  "surface flex items-center gap-3 p-3",
                  q > 0 && "border-primary/50",
                )}
              >
                <button onClick={() => setDetail(role)} aria-label={`Détails ${role.name}`}>
                  <RoleSigil role={role} />
                </button>
                <button
                  onClick={() => setDetail(role)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate font-display font-bold">{role.name}</span>
                    <CampBadge camp={role.camp} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {role.short}
                  </p>
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => removeRole(role.id)}
                    disabled={q === 0}
                    className="h-8 w-8 rounded-lg bg-secondary text-lg disabled:opacity-30"
                    aria-label="Retirer"
                  >
                    −
                  </button>
                  <span className="w-5 text-center font-bold">{q}</span>
                  <button
                    onClick={() => addRole(role.id)}
                    className="h-8 w-8 rounded-lg bg-primary/20 text-lg text-primary"
                    aria-label="Ajouter"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Modal open={!!detail} onClose={() => setDetail(null)}>
        {detail && <RoleDetail role={detail} onClose={() => setDetail(null)} />}
      </Modal>

      <BarreBas>
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {totalSelected} / {cible} cartes {state.selection["voleur"] ? "(dont 2 au centre)" : ""}
          </span>
          <span className={cn(loups === 0 && "text-destructive")}>🐺 {loups} loups</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onBack}>
            ←
          </Button>
          <Button className="flex-1" disabled={manque !== 0 || loups === 0} onClick={lancer}>
            {manque > 0
              ? `Ajoutez ${manque} carte${manque > 1 ? "s" : ""}`
              : manque < 0
                ? `Retirez ${-manque} carte${-manque > 1 ? "s" : ""}`
                : loups === 0
                  ? "Il faut au moins un loup"
                  : "Distribuer les cartes 🎴"}
          </Button>
        </div>
      </BarreBas>
    </>
  );
}

function BarreBas({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-5 pt-3 pb-6 backdrop-blur">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  );
}
