import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button, CampBadge, Modal, PageHeader, RoleDetail, RoleSigil } from "@/components/ui-kit";
import { CAMP_LABEL, ROLES, ROLES_BY_ID, type Camp, type Role } from "@/data/roles";
import { COMPOSITIONS, type Composition } from "@/data/compositions";
import { createGame } from "@/lib/party.functions";
import { useGame } from "@/lib/game-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/nouvelle-partie")({
  head: () => ({
    meta: [
      { title: "Créer une partie de Loup-Garou — composition et code" },
      {
        name: "description",
        content:
          "Choisissez le nombre de joueurs, une composition conseillée, puis partagez le code de partie avec le village.",
      },
      { property: "og:title", content: "Créer une partie de Loup-Garou" },
      {
        property: "og:description",
        content: "Compositions équilibrées de 7 à 24 joueurs et code de partie à partager.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NouvellePartie,
});

const MIN = 7;
const MAX = 24;

function NouvellePartie() {
  const navigate = useNavigate();
  const { token, saveSession } = useGame();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [count, setCount] = useState(8);
  const [selection, setSelection] = useState<Record<string, number>>({});
  const [thiefVariant, setThiefVariant] = useState<"centre" | "echange">("centre");
  const [detail, setDetail] = useState<Role | null>(null);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const extraCards = selection["voleur"] && thiefVariant === "centre" ? 2 : 0;
  const total = Object.values(selection).reduce((a, b) => a + b, 0);
  const cible = count + extraCards;

  const propositions = useMemo(
    () => COMPOSITIONS.filter((c) => c.players === count),
    [count],
  );

  function appliquer(c: Composition) {
    setSelection({ ...c.roles });
    setStep(3);
  }

  function ajuster(roleId: string, delta: number) {
    setSelection((s) => {
      const role = ROLES_BY_ID[roleId]!;
      const cur = s[roleId] ?? 0;
      const max = role.max === 0 ? 99 : role.max;
      const next = Math.max(0, Math.min(max, cur + delta));
      const copy = { ...s };
      if (next === 0) delete copy[roleId];
      else copy[roleId] = next;
      return copy;
    });
  }

  async function lancer() {
    setBusy(true);
    setErreur(null);
    try {
      const { code } = await createGame({
        data: { hostToken: token, playerCount: count, selection, thiefVariant },
      });
      saveSession({ code, host: true });
      await navigate({ to: "/maitre" });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de créer la partie");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-10 pb-28">
      <PageHeader
        title="Nouvelle partie"
        subtitle={
          step === 1
            ? "Combien de joueurs autour de la table ? (le Maître du Jeu n'en fait pas partie)"
            : step === 2
              ? "Choisissez une composition conseillée, ou partez d'une base à ajuster."
              : "Ajustez les cartes puis générez le code de partie."
        }
        back="/"
      />

      {step === 1 && (
        <section className="animate-rise">
          <div className="surface flex items-center justify-between p-5">
            <button
              onClick={() => setCount((c) => Math.max(MIN, c - 1))}
              className="btn-base btn-ghost h-12 w-12 text-xl"
              aria-label="Un joueur de moins"
            >
              −
            </button>
            <div className="text-center">
              <div className="font-display text-5xl font-black text-gradient-moon">{count}</div>
              <div className="text-xs text-muted-foreground">joueurs</div>
            </div>
            <button
              onClick={() => setCount((c) => Math.min(MAX, c + 1))}
              className="btn-base btn-ghost h-12 w-12 text-xl"
              aria-label="Un joueur de plus"
            >
              +
            </button>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Minimum {MIN} joueurs pour une partie intéressante.
          </p>
          <Button className="mt-6 w-full py-4" onClick={() => setStep(2)}>
            Voir les compositions conseillées
          </Button>
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-col gap-3">
          {propositions.length === 0 && (
            <p className="surface p-4 text-sm text-muted-foreground">
              Pas de préréglage pour {count} joueurs : composez librement à l'étape suivante.
            </p>
          )}
          {propositions.map((c) => (
            <button
              key={c.id}
              onClick={() => appliquer(c)}
              className="surface p-4 text-left active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <span className="font-display font-bold">{c.name}</span>
                <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                  {c.difficulty}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>
              <p className="mt-2 text-[11px] text-muted-foreground/80">
                {Object.entries(c.roles)
                  .map(([id, n]) => `${ROLES_BY_ID[id]?.name ?? id}${n > 1 ? ` ×${n}` : ""}`)
                  .join(" · ")}
              </p>
            </button>
          ))}
          <Button variant="ghost" className="mt-2 w-full" onClick={() => setStep(3)}>
            Composer moi-même
          </Button>
        </section>
      )}

      {step === 3 && (
        <section>
          <div className="surface sticky top-2 z-10 mb-4 flex items-center justify-between p-3 text-sm">
            <span className={cn(total === cible ? "text-primary" : "text-muted-foreground")}>
              {total} / {cible} cartes
            </span>
            <button className="text-xs text-muted-foreground underline" onClick={() => setStep(2)}>
              Compositions
            </button>
          </div>

          {selection["voleur"] ? (
            <div className="surface mb-4 p-4">
              <p className="font-display text-sm font-bold">Variante du Voleur</p>
              <div className="mt-2 flex gap-2">
                {(
                  [
                    ["centre", "2 cartes au centre"],
                    ["echange", "Échange avec un joueur"],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    onClick={() => setThiefVariant(v)}
                    className={cn(
                      "flex-1 rounded-xl border px-3 py-2 text-xs font-semibold",
                      thiefVariant === v
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-secondary text-muted-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                « Centre » ajoute deux cartes supplémentaires à la pioche. « Échange » : le Voleur
                prend définitivement la carte d'un joueur, les deux sont prévenus.
              </p>
            </div>
          ) : null}

          {(["loups", "villageois", "special", "solitaire"] as Camp[]).map((camp) => (
            <div key={camp} className="mb-5">
              <h2 className="mb-2 text-xs tracking-widest text-muted-foreground uppercase">
                {CAMP_LABEL[camp]}
              </h2>
              <ul className="flex flex-col gap-2">
                {ROLES.filter((r) => r.camp === camp).map((role) => (
                  <li key={role.id} className="surface flex items-center gap-3 p-2.5">
                    <button onClick={() => setDetail(role)} aria-label={`Détails ${role.name}`}>
                      <RoleSigil role={role} size="sm" />
                    </button>
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setDetail(role)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">{role.name}</span>
                        <CampBadge camp={role.camp} />
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">{role.short}</p>
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => ajuster(role.id, -1)}
                        className="btn-base btn-ghost h-8 w-8 p-0"
                        aria-label="Retirer"
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-sm font-bold">
                        {selection[role.id] ?? 0}
                      </span>
                      <button
                        onClick={() => ajuster(role.id, 1)}
                        className="btn-base btn-ghost h-8 w-8 p-0"
                        aria-label="Ajouter"
                      >
                        +
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-border bg-background/95 p-4 backdrop-blur">
            {erreur && <p className="mb-2 text-center text-xs text-destructive">{erreur}</p>}
            <Button
              className="w-full py-4"
              disabled={total !== cible || busy}
              onClick={() => void lancer()}
            >
              {total === cible
                ? busy
                  ? "Création…"
                  : "Générer le code de partie"
                : `Il manque ${cible - total} carte(s)`}
            </Button>
          </div>
        </section>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)}>
        {detail && <RoleDetail role={detail} onClose={() => setDetail(null)} />}
      </Modal>
    </main>
  );
}
