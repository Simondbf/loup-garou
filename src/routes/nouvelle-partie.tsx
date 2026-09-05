import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button, Modal, PageHeader, RoleDetail, RoleSigil } from "@/components/ui-kit";
import { ROLES_BY_ID, type Role } from "@/data/roles";
import { ChoixRoles } from "@/components/choix-roles";
import { compositionAuto, rolesDistribuables } from "@/data/composition";
import { createGame, dealCards } from "@/lib/party.functions";
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
        content: "Composez votre table de 7 à 30 joueurs et partagez le code de partie.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NouvellePartie,
});

const MIN = 7;
const MAX = 30;

function NouvellePartie() {
  const navigate = useNavigate();
  const { token, saveSession } = useGame();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [count, setCount] = useState(8);
  const [saisie, setSaisie] = useState("8");
  const [singleDevice, setSingleDevice] = useState(false);
  const [selection, setSelection] = useState<Record<string, number>>({});
  const [thiefVariant, setThiefVariant] = useState<"centre" | "echange">("echange");
  const [detail, setDetail] = useState<Role | null>(null);
  const [aideAppareil, setAideAppareil] = useState(false);

  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Le Renard et le Montreur d'Ours lisent les voisins de table : hors du
  // mode un seul téléphone, l'ordre des places ne suit pas la table et ces
  // deux rôles ne sont pas proposés.
  const pioche = rolesDistribuables(singleDevice);

  // La composition conseillée est pré-remplie dès l'arrivée sur l'étape 2.
  useEffect(() => {
    if (step !== 2) return;
    setSelection(compositionAuto(count, singleDevice));
  }, [step, count, singleDevice]);

  // La variante « vol de rôle » oblige chaque joueur à revérifier sa carte le
  // matin : impossible quand tout le monde partage un seul téléphone.
  const varianteVoleur: "centre" | "echange" = singleDevice ? "centre" : thiefVariant;
  const extraCards = selection["voleur"] && varianteVoleur === "centre" ? 2 : 0;
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
        data: {
          hostToken: token,
          playerCount: count,
          // En multi-téléphones, ni l'effectif ni les cartes ne sont connus
          // ici : le village se compte en arrivant, et le Maître du Jeu
          // choisira la composition une fois les profils validés.
          selection: singleDevice ? selection : {},
          thiefVariant: varianteVoleur,
          singleDevice,
        },
      });
      saveSession({ code, host: true });
      // Mode un seul téléphone : on distribue tout de suite et on enchaîne sur
      // le tour de table. Le téléphone ne circule qu'une fois — prénom puis
      // carte pour chacun — au lieu de deux tours successifs.
      if (singleDevice) {
        await dealCards({ data: { code, token } });
        await navigate({ to: "/tour-de-table" });
      } else {
        await navigate({ to: "/maitre" });
      }
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
            ? "Combien de joueurs attendez-vous ? (le Maître du Jeu n'en fait pas partie)"
            : "La composition conseillée est déjà prête : ajustez-la comme vous voulez."
        }
        back={step === 1 ? "/" : undefined}
        onBack={step === 1 ? undefined : () => setStep(1)}
        backLabel={step === 2 ? "Nombre de joueurs" : "Retour"}
      />

      {step === 1 && (
        <section className="animate-rise">
          <div
            className={cn(
              "surface flex items-center justify-between p-5",
              !singleDevice && "hidden",
            )}
          >
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
                  const clamp =
                    Number.isFinite(n) && saisie ? Math.min(MAX, Math.max(MIN, n)) : count;
                  setCount(clamp);
                  setSaisie(String(clamp));
                }}
                aria-label="Nombre de joueurs"
                className="w-24 rounded-xl border-2 border-dashed border-border bg-transparent py-1 text-center text-4xl font-semibold tabular-nums text-primary outline-none focus:border-primary"
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
          <p
            className={cn(
              "mt-3 text-center text-xs text-muted-foreground",
              !singleDevice && "hidden",
            )}
          >
            {" "}
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
                {" "}
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

          {!singleDevice && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              {" "}
              Vous n'avez rien à compter : donnez le code à la table, les profils arriveront
              d'eux-mêmes et les cartes se choisiront ensuite, une fois le village au complet.
            </p>
          )}

          <Button
            className="mt-6 w-full py-4"
            disabled={busy}
            onClick={() => (singleDevice ? setStep(2) : void lancer())}
          >
            {singleDevice ? "Choisir la composition" : "Ouvrir le salon"}
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
                  {" "}
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

          <button
            onClick={() => setSelection(compositionAuto(count))}
            className="mb-4 w-full rounded-xl border border-border bg-secondary px-3 py-3 text-left text-xs"
          >
            <span className="block font-display font-bold"> Composer automatiquement</span>
            <span className="block text-muted-foreground">
              {" "}
              Une table équilibrée pour {count} joueurs, que vous pouvez ensuite retoucher.
            </span>
          </button>

          <ChoixRoles
            pioche={pioche}
            selection={selection}
            onSelection={setSelection}
            onDetail={setDetail}
          />

          {selection["comedien"] ? (
            <p className="mb-3 rounded-xl border border-border p-3 text-[11px] text-muted-foreground">
              {" "}
              Le Comédien réclame trois cartes de village en plus des vôtres. Elles seront tirées au
              sort à la distribution et posées au centre, face cachée.
            </p>
          ) : null}

          <Button
            className="w-full py-4"
            disabled={total !== cible || busy}
            onClick={() => void lancer()}
          >
            {total === cible
              ? busy
                ? "Création…"
                : "Créer la partie"
              : total < cible
                ? `Il manque ${cible - total} carte(s)`
                : `${total - cible} carte(s) en trop`}
          </Button>
        </section>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)}>
        {detail && <RoleDetail role={detail} onClose={() => setDetail(null)} />}
      </Modal>

      <Modal open={aideAppareil} onClose={() => setAideAppareil(false)}>
        <div className="p-1">
          <h2 className="font-display text-lg font-bold">Un seul téléphone ?</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {" "}
            Cochez cette case si la table n'utilise qu'un appareil : le téléphone du Maître du Jeu
            porte toutes les places et circule de joueur en joueur au moment de la distribution.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {" "}
            Laissez-la décochée pour jouer avec plusieurs appareils : un code de partie est généré,
            et chacun rejoint avec son téléphone — un appareil peut aussi porter deux ou trois
            joueurs.
          </p>
          <Button className="mt-4 w-full" onClick={() => setAideAppareil(false)}>
            {" "}
            J'ai compris
          </Button>
        </div>
      </Modal>
    </main>
  );
}
