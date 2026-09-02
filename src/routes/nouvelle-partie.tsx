import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button, Modal, PageHeader, RoleDetail, RoleSigil } from "@/components/ui-kit";
import { CAMP_LABEL, ROLES, ROLES_BY_ID, type Camp, type Role } from "@/data/roles";
import { COMPOSITIONS } from "@/data/compositions";
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
          "Choisissez le nombre de joueurs, ajustez la composition conseillée, puis partagez le code de partie avec le village.",
      },
      { property: "og:title", content: "Créer une partie de Loup-Garou" },
      {
        property: "og:description",
        content: "Compositions équilibrées de 7 à 30 joueurs et code de partie à partager.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NouvellePartie,
});

const MIN = 7;
const MAX = 30;

/** Rôles réellement distribuables : Amoureux et Capitaine découlent du jeu, pas de la pioche. */
const ROLES_DISTRIBUABLES = ROLES.filter((r) => !r.derived);

/**
 * Composition de secours quand aucun préréglage n'existe : environ un tiers de la table
 * côté loups, et le moins de Simples Villageois possible (rôle sans pouvoir).
 */
function compositionAuto(count: number): Record<string, number> {
  const loups = Math.max(2, Math.round(count / 3));
  const base: Record<string, number> = { "loup-garou": loups, voyante: 1, sorciere: 1 };
  let reste = count - loups - 2;
  for (const id of [
    "chasseur",
    "cupidon",
    "salvateur",
    "petite-fille",
    "ancien",
    "renard",
    "idiot-du-village",
    "bouc-emissaire",
    "corbeau",
    "montreur-ours",
    "juge-begue",
    "servante-devouee",
  ]) {
    if (reste <= 0) break;
    base[id] = 1;
    reste -= 1;
  }
  if (reste > 0) base["simple-villageois"] = reste;
  return base;
}

function NouvellePartie() {
  const navigate = useNavigate();
  const { token, saveSession } = useGame();
  const [step, setStep] = useState<1 | 2>(1);
  const [count, setCount] = useState(8);
  const [saisie, setSaisie] = useState("8");
  const [singleDevice, setSingleDevice] = useState(false);
  const [selection, setSelection] = useState<Record<string, number>>({});
  const [thiefVariant, setThiefVariant] = useState<"centre" | "echange">("centre");
  const [detail, setDetail] = useState<Role | null>(null);
  const [aideAppareil, setAideAppareil] = useState(false);

  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const propositions = useMemo(() => COMPOSITIONS.filter((c) => c.players === count), [count]);

  // La composition conseillée est pré-remplie dès l'arrivée sur l'étape 2.
  useEffect(() => {
    if (step !== 2) return;
    setSelection(propositions[0] ? { ...propositions[0].roles } : compositionAuto(count));
  }, [step, count, propositions]);

  const extraCards = selection["voleur"] && thiefVariant === "centre" ? 2 : 0;
  const total = Object.values(selection).reduce((a, b) => a + b, 0);
  const cible = count + extraCards;

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

  function completerVillageois() {
    const manque = cible - total;
    if (manque <= 0) return;
    setSelection((s) => ({
      ...s,
      "simple-villageois": (s["simple-villageois"] ?? 0) + manque,
    }));
  }

  async function lancer() {
    setBusy(true);
    setErreur(null);
    try {
      const { code } = await createGame({
        data: { hostToken: token, playerCount: count, selection, thiefVariant, singleDevice },
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
            : "La composition conseillée est déjà prête : ajustez-la comme vous voulez."
        }
        back={step === 1 ? "/" : undefined}
        onBack={step === 2 ? () => setStep(1) : undefined}
        backLabel={step === 2 ? "Nombre de joueurs" : "Retour"}
      />

      {step === 1 && (
        <section className="animate-rise">
          <div className="surface flex items-center justify-between p-5">
            <button
              onClick={() =>
                setCount((c) => {
                  const n = Math.max(MIN, c - 1);
                  setSaisie(String(n));
                  return n;
                })
              }
              className="btn-base btn-ghost h-12 w-12 text-xl"
              aria-label="Un joueur de moins"
            >
              −
            </button>
            <div className="text-center">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={saisie}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
                  setSaisie(v);
                  const n = Number(v);
                  if (v && n >= MIN && n <= MAX) setCount(n);
                }}
                onBlur={() => {
                  const n = Number(saisie);
                  const clamp = Number.isFinite(n) && saisie ? Math.min(MAX, Math.max(MIN, n)) : count;
                  setCount(clamp);
                  setSaisie(String(clamp));
                }}
                aria-label="Nombre de joueurs"
                className="w-24 rounded-xl border-2 border-dashed border-border bg-transparent py-1 text-center font-display text-5xl font-black text-gradient-moon outline-none focus:border-primary"
              />
              <div className="text-xs text-muted-foreground">joueurs · touchez pour saisir</div>
            </div>
            <button
              onClick={() =>
                setCount((c) => {
                  const n = Math.min(MAX, c + 1);
                  setSaisie(String(n));
                  return n;
                })
              }
              className="btn-base btn-ghost h-12 w-12 text-xl"
              aria-label="Un joueur de plus"
            >
              +
            </button>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            De {MIN} à {MAX} joueurs.
          </p>

          <div className="surface mt-5 flex w-full items-center gap-3 p-4">
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={singleDevice}
                onChange={(e) => setSingleDevice(e.target.checked)}
                className="h-5 w-5 shrink-0 accent-primary"
              />
              <span className="font-display text-sm font-bold">
                Un seul téléphone pour tout le monde
              </span>
            </label>
            <button
              type="button"
              onClick={() => setAideAppareil(true)}
              aria-label="En savoir plus sur ce réglage"
              className="h-7 w-7 shrink-0 rounded-full border border-border text-sm font-bold text-muted-foreground"
            >
              ?
            </button>
          </div>

          <Button className="mt-6 w-full py-4" onClick={() => setStep(2)}>
            Choisir la composition
          </Button>
        </section>
      )}


      {step === 2 && (
        <section>
          <div className="surface sticky top-2 z-10 mb-4 flex items-center justify-between gap-2 p-3 text-sm">
            <span className={cn(total === cible ? "text-primary" : "text-muted-foreground")}>
              {total} / {cible} cartes
            </span>
            <div className="flex gap-2">
              {total < cible && (
                <button
                  className="rounded-lg border border-border px-2 py-1 text-[11px]"
                  onClick={completerVillageois}
                >
                  Compléter en Villageois
                </button>
              )}
              <button
                className="rounded-lg border border-border px-2 py-1 text-[11px]"
                onClick={() => setStep(1)}
              >
                {count} joueurs
              </button>
            </div>
          </div>

          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {propositions.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelection({ ...c.roles })}
                className="shrink-0 rounded-xl border border-border bg-secondary px-3 py-2 text-left text-[11px]"
              >
                <span className="block font-display font-bold">{c.name}</span>
                <span className="block text-muted-foreground">{c.difficulty}</span>
              </button>
            ))}
            <button
              onClick={() => setSelection(compositionAuto(count))}
              className="shrink-0 rounded-xl border border-border bg-secondary px-3 py-2 text-left text-[11px]"
            >
              <span className="block font-display font-bold">Automatique</span>
              <span className="block text-muted-foreground">équilibrée</span>
            </button>
          </div>

          <p className="mb-4 text-[11px] text-muted-foreground">
            Le Capitaine (élu) et les Amoureux (Cupidon) s'ajoutent en cours de partie : ils ne
            comptent pas dans les cartes distribuées.
          </p>


          {(["loups", "villageois", "special", "solitaire"] as Camp[]).map((camp) => (
            <div key={camp} className="mb-5">
              <h2 className="mb-2 text-xs tracking-widest text-muted-foreground uppercase">
                {CAMP_LABEL[camp]}
              </h2>
              <ul className="flex flex-col gap-2">
                {ROLES_DISTRIBUABLES.filter((r) => r.camp === camp).map((role) => (
                  <li key={role.id} className="surface p-2.5">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setDetail(role)} aria-label={`Détails ${role.name}`}>
                        <RoleSigil role={role} size="sm" />
                      </button>
                      <button className="min-w-0 flex-1 text-left" onClick={() => setDetail(role)}>
                        <span className="block truncate text-sm font-semibold">{role.name}</span>
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
                    </div>

                    {role.id === "voleur" && selection["voleur"] ? (
                      <div className="mt-2 flex gap-1 rounded-xl bg-secondary p-1">
                        {(
                          [
                            ["centre", "2 cartes au centre"],
                            ["echange", "Échange chaque nuit"],
                          ] as const
                        ).map(([v, label]) => (
                          <button
                            key={v}
                            onClick={() => setThiefVariant(v)}
                            className={cn(
                              "flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition",
                              thiefVariant === v
                                ? "bg-card text-primary shadow-sm"
                                : "text-muted-foreground",
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    ) : null}
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
                  : singleDevice
                    ? "Créer la partie"
                    : "Générer le code de partie"
                : total < cible
                  ? `Il manque ${cible - total} carte(s)`
                  : `${total - cible} carte(s) en trop`}
            </Button>
          </div>
        </section>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)}>
        {detail && <RoleDetail role={detail} onClose={() => setDetail(null)} />}
      </Modal>

      <Modal open={aideAppareil} onClose={() => setAideAppareil(false)}>
        <div className="p-1">
          <h2 className="font-display text-lg font-bold">Un seul téléphone ?</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Cochez cette case si la table n'utilise qu'un appareil : le téléphone du Maître du Jeu
            porte toutes les places et circule de joueur en joueur au moment de la distribution.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Laissez-la décochée pour jouer avec plusieurs appareils : un code de partie est généré,
            et chacun rejoint avec son téléphone — un appareil peut aussi porter deux ou trois
            joueurs.
          </p>
          <Button className="mt-4 w-full" onClick={() => setAideAppareil(false)}>
            J'ai compris
          </Button>
        </div>
      </Modal>
    </main>
  );

}
