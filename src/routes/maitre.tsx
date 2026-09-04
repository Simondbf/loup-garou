import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button, CampBadge, LinkButton, PageHeader, RoleSigil } from "@/components/ui-kit";
import { ConduiteJour } from "@/components/conduite-jour";
import { ConduiteNuit } from "@/components/conduite-nuit";
import { CAMP_LABEL, ROLES_BY_ID } from "@/data/roles";
import {
  ajusterRole,
  cartesAttendues,
  compositionAuto,
  rolesDistribuables,
} from "@/data/composition";
import { useGame } from "@/lib/game-store";
import {
  PLACES_MAX,
  PLACES_MIN,
  dealCards,
  endGame,
  gagPlayer,
  addSeat,
  libererProfil,
  removeSeat,
  resolveNight,
  servanteEchange,
  setCaptain,
  setDayAction,
  setDead,
  setHostState,
  setPhase,
  setPublicRole,
  setLovers,
  setNightAction,
  setSelection,
  validerProfils,
  setSeatName,
  thiefSwap,
  type HostState,
  type PatchJour,
  type PatchNuit,
  type SeatDTO,
} from "@/lib/party.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/maitre")({
  head: () => ({
    meta: [
      { title: "Tableau de bord du Maître du Jeu — Loup-Garou" },
      {
        name: "description",
        content:
          "Ordre de réveil, morts, capitaine, amoureux, révélations privées et bâillon du Magicien : tout le village en un écran.",
      },
      { property: "og:title", content: "Maître du Jeu — Loup-Garou" },
      {
        property: "og:description",
        content: "Pilotez la nuit, marquez les morts et montrez les cartes aux bons joueurs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Maitre,
});

type Onglet = "nuit" | "reveals";

function Maitre() {
  const navigate = useNavigate();
  const { game, session, token, hydrated, apply, saveSession } = useGame();
  // Le MJ passe l'essentiel de la partie à conduire la nuit : c'est l'onglet
  // qui doit s'ouvrir en premier une fois les cartes distribuées.
  const [onglet, setOnglet] = useState<Onglet>("nuit");
  const [erreur, setErreur] = useState<string | null>(null);
  const [revealFrom, setRevealFrom] = useState<number | null>(null);

  useEffect(() => {
    if (hydrated && !session?.host) void navigate({ to: "/" });
  }, [hydrated, session, navigate]);

  const run = async (p: Promise<any>) => {
    try {
      apply(await p);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action impossible");
    }
  };

  const sansAppel = useMemo(() => {
    if (!game) return [];
    const ids = new Set(game.seats.map((s) => s.roleId).filter(Boolean) as string[]);
    return [...ids].map((id) => ROLES_BY_ID[id]!).filter((r) => r?.sansAppel);
  }, [game]);

  if (!game) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-16 text-center">
        <p className="text-sm text-muted-foreground">Chargement de la partie…</p>
      </main>
    );
  }

  const vivants = game.seats.filter((s) => s.alive).length;
  const prets = game.seats.filter((s) => s.claimed).length;
  // On ne distribue que si la composition tombe juste : autant de cartes que
  // de joueurs présents, plus les deux cartes du centre s'il y a un Voleur.
  const cartesPosees = Object.values(game.selection).reduce((a, b) => a + b, 0);
  const distributionPossible =
    game.seats.length >= PLACES_MIN &&
    cartesPosees === cartesAttendues(game.seats.length, game.selection, game.thiefVariant);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-10 pb-16">
      <PageHeader
        title={game.singleDevice ? "Un seul téléphone" : `Code ${game.code}`}
        subtitle={
          game.status === "lobby"
            ? game.singleDevice
              ? "Votre appareil porte toutes les places et tourne autour de la table."
              : "Le village se rassemble : les profils arrivent d'eux-mêmes."
            : game.status === "composition"
              ? `${game.seats.length} joueurs enregistrés · choisissez les cartes.`
              : `Nuit ${game.night} · ${game.phase} · ${vivants} vivants${
                  game.singleDevice ? " · un seul téléphone" : ` · code ${game.code}`
                }`
        }
      />

      {erreur && <p className="mb-3 text-center text-xs text-destructive">{erreur}</p>}

      {game.status === "lobby" || game.status === "composition" ? (
        game.singleDevice ? (
          /* Un seul téléphone : le MJ compte la tablée et choisit les cartes
             sur le même écran, puis fait circuler l'appareil. */
          <section className="flex flex-col gap-3">
            <div className="surface flex items-center justify-between p-5">
              <button
                onClick={() =>
                  void run(
                    removeSeat({
                      data: { code: game.code, token, position: game.seats.length },
                    }),
                  )
                }
                disabled={game.seats.length <= PLACES_MIN}
                className="btn-base btn-ghost h-12 w-12 text-xl"
                aria-label="Un joueur de moins"
              >
                −
              </button>
              <div className="text-center">
                <p className="text-4xl font-semibold tabular-nums text-primary">
                  {game.seats.length}
                </p>
                <p className="text-xs text-muted-foreground">joueurs</p>
              </div>
              <button
                onClick={() => void run(addSeat({ data: { code: game.code, token } }))}
                disabled={game.seats.length >= PLACES_MAX}
                className="btn-base btn-ghost h-12 w-12 text-xl"
                aria-label="Un joueur de plus"
              >
                +
              </button>
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
              Ajoutez ou retirez des joueurs maintenant : après, le téléphone commence à tourner et
              chacun saisit son prénom à son tour.
            </p>

            <Composition
              effectif={game.seats.length}
              selection={game.selection}
              variante={game.thiefVariant}
              unSeulTelephone
              comedienCartes={game.comedienCartes}
              onSelection={(selection) =>
                void run(setSelection({ data: { code: game.code, token, selection } }))
              }
              onComedien={(comedienCartes) =>
                void run(
                  setSelection({
                    data: { code: game.code, token, selection: game.selection, comedienCartes },
                  }),
                )
              }
            />

            <Button
              className="w-full py-4"
              disabled={!distributionPossible}
              onClick={async () => {
                await run(dealCards({ data: { code: game.code, token } }));
                await navigate({ to: "/tour-de-table" });
              }}
            >
              Commencer la distribution
            </Button>
          </section>
        ) : game.status === "lobby" ? (
          /* Appel des profils : le MJ donne le code et regarde le village
             arriver. Il ne saisit rien lui-même. */
          <section className="flex flex-col gap-3">
            <div className="surface p-5 text-center">
              <p className="text-xs tracking-widest text-muted-foreground uppercase">
                Code de partie
              </p>
              <p className="font-display text-5xl font-black tracking-[0.3em] text-gradient-moon">
                {game.code}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Chacun ouvre l'application, choisit « Rejoindre », entre ce code puis son prénom.
                Les profils s'affichent ici au fur et à mesure.
              </p>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              {game.seats.length} profil{game.seats.length > 1 ? "s" : ""} enregistré
              {game.seats.length > 1 ? "s" : ""}
            </p>

            <ul className="flex flex-col gap-2">
              {game.seats.map((s) => (
                <li key={s.position} className="surface flex items-center gap-3 p-3">
                  <span className="w-6 text-xs text-muted-foreground">{s.position}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {s.name || (
                      <span className="text-muted-foreground italic">prénom en cours…</span>
                    )}
                  </span>
                  <button
                    onClick={() =>
                      void run(
                        s.name
                          ? libererProfil({
                              data: { code: game.code, token, position: s.position },
                            })
                          : removeSeat({ data: { code: game.code, token, position: s.position } }),
                      )
                    }
                    aria-label={
                      s.name ? `Libérer le profil de ${s.name}` : `Retirer la place ${s.position}`
                    }
                    className="shrink-0 rounded-lg border border-border px-2 py-1 text-[11px] text-muted-foreground"
                  >
                    {s.name ? "Libérer" : "✕"}
                  </button>
                </li>
              ))}
              {game.seats.length === 0 && (
                <li className="surface p-4 text-center text-xs text-muted-foreground">
                  Le village est encore vide. Donnez le code à voix haute.
                </li>
              )}
            </ul>

            <Button
              className="w-full py-4"
              disabled={game.seats.length < PLACES_MIN}
              onClick={() =>
                void run(validerProfils({ data: { code: game.code, token, valide: true } }))
              }
            >
              Valider les profils
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              {game.seats.length < PLACES_MIN
                ? `Il faut au moins ${PLACES_MIN} joueurs.`
                : "« Libérer » rend son profil à un joueur qui s'est trompé : il le ressaisit sur son téléphone. Un retardataire peut encore rejoindre après."}
            </p>
          </section>
        ) : (
          /* Choix des cartes : l'effectif est déjà connu, il se met à jour
             tout seul si quelqu'un arrive entre-temps. */
          <section className="flex flex-col gap-3">
            <Composition
              effectif={game.seats.length}
              selection={game.selection}
              variante={game.thiefVariant}
              unSeulTelephone={false}
              comedienCartes={game.comedienCartes}
              onSelection={(selection) =>
                void run(setSelection({ data: { code: game.code, token, selection } }))
              }
              onComedien={(comedienCartes) =>
                void run(
                  setSelection({
                    data: { code: game.code, token, selection: game.selection, comedienCartes },
                  }),
                )
              }
            />

            <Button
              className="w-full py-4"
              disabled={!distributionPossible}
              onClick={() => void run(dealCards({ data: { code: game.code, token } }))}
            >
              Distribuer les cartes
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              Un retardataire peut encore rejoindre avec le code {game.code} : l'effectif se met à
              jour tout seul, vous n'aurez qu'une carte de plus à poser.
            </p>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() =>
                void run(validerProfils({ data: { code: game.code, token, valide: false } }))
              }
            >
              ← Revenir aux profils
            </Button>
          </section>
        )
      ) : (
        <>
          {/* Multi-téléphones : le MJ n'a que le déroulé du jeu. Montrer une
              carte n'a de sens que si l'appareil circule. */}
          <div className={cn("mb-4 flex gap-2", !game.singleDevice && "hidden")}>
            {(
              [
                ["nuit", "🌙 Conduire"],
                ["reveals", "👁️ Montrer"],
              ] as [Onglet, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setOnglet(id)}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2 text-xs font-semibold",
                  onglet === id
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-secondary text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {game.singleDevice && (
            <LinkButton to="/distribution" variant="ghost" className="mb-4 w-full py-3 text-sm">
              📱 Faire tourner le téléphone (prénoms + cartes)
            </LinkButton>
          )}

          {onglet === "nuit" && (
            <section className="flex flex-col gap-3">
              <div className="surface flex items-center justify-between p-4">
                <div>
                  <p className="font-display text-base font-black">
                    {game.phase === "nuit" ? `🌙 Nuit ${game.night}` : `☀️ Jour ${game.night}`}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {game.phase === "nuit"
                      ? "Suivez les étapes ci-dessous, puis lever du jour."
                      : "Suivez le fil : annonces, débat, vote, et tout ce qui s'ensuit."}
                  </p>
                </div>
              </div>

              {game.phase === "jour" && (
                <ConduiteJour
                  game={game}
                  onJour={(patch: PatchJour) =>
                    run(setDayAction({ data: { code: game.code, token, patch } }))
                  }
                  onMort={(position, cause) =>
                    run(
                      setDead({
                        data: { code: game.code, token, position, alive: false, cause },
                      }),
                    )
                  }
                  onCapitaine={(position) =>
                    run(setCaptain({ data: { code: game.code, token, position } }))
                  }
                  onPublic={(position, value) =>
                    run(setPublicRole({ data: { code: game.code, token, position, value } }))
                  }
                  onServante={(servante, morte) =>
                    run(servanteEchange({ data: { code: game.code, token, servante, morte } }))
                  }
                  onEtat={(patch) => run(setHostState({ data: { code: game.code, token, patch } }))}
                  onNuitSuivante={() =>
                    run(
                      setPhase({
                        data: { code: game.code, token, phase: "nuit", night: game.night + 1 },
                      }),
                    )
                  }
                />
              )}

              {game.phase === "nuit" && (
                <ConduiteNuit
                  game={game}
                  onAction={(patch: PatchNuit) =>
                    void run(setNightAction({ data: { code: game.code, token, patch } }))
                  }
                  onEtape={(index) =>
                    void run(
                      setNightAction({ data: { code: game.code, token, patch: { etape: index } } }),
                    )
                  }
                  onLovers={(positions) =>
                    void run(setLovers({ data: { code: game.code, token, positions } }))
                  }
                  onResoudre={() => void run(resolveNight({ data: { code: game.code, token } }))}
                  onVol={(position, avec) =>
                    void run(thiefSwap({ data: { code: game.code, token, position, avec } }))
                  }
                  onBaillon={(position) =>
                    void run(gagPlayer({ data: { code: game.code, token, position } }))
                  }
                />
              )}

              {sansAppel.length > 0 && (
                <div className="surface border border-destructive/40 p-4">
                  <h2 className="font-display text-sm font-bold text-destructive">
                    À ne jamais appeler à voix haute
                  </h2>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Ces rôles sont en jeu mais n'ont pas de tour à eux. Prononcer leur nom suffirait
                    à les griller.
                  </p>
                  <ul className="mt-3 flex flex-col gap-3">
                    {sansAppel.map((r) => (
                      <li key={r.id} className="flex items-start gap-3">
                        <RoleSigil role={r} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{r.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {game.seats
                              .filter((s) => s.roleId === r.id)
                              .map(
                                (s) => `${s.name || `Place ${s.position}`}${s.alive ? "" : " †"}`,
                              )
                              .join(", ")}
                          </p>
                          <p className="mt-1 text-[11px] leading-relaxed">{r.sansAppel}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {game.hostState.villageSansPouvoirs && (
                <div className="surface border border-destructive/60 p-4">
                  <h2 className="font-display text-sm font-bold text-destructive">
                    ⚰️ L'Ancien a été éliminé par le village
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed">
                    Annoncez-le à voix haute au village : par dépit, tous les villageois perdent
                    leur pouvoir pour le reste de la partie. Voyante, Sorcière, Salvateur, Renard,
                    Chasseur… n'agissent plus, et inutile de continuer à les appeler la nuit — tout
                    le monde a vu l'Ancien tomber au vote. Les Loups-Garous et les rôles solitaires,
                    eux, jouent normalement.
                  </p>
                </div>
              )}

              {game.seats.some((s) => s.roleId === "magicien") && (
                <div className="surface p-4">
                  <h2 className="font-display text-sm font-bold">Bâillon du Magicien</h2>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Le joueur désigné ne pourra pas parler demain, mais votera. Une même cible ne
                    peut pas être re-désignée avant trois nuits.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {game.seats
                      .filter((s) => s.alive)
                      .map((s) => {
                        const recent = game.gagHistory.some(
                          (h) => h.position === s.position && game.night - h.night < 3,
                        );
                        return (
                          <button
                            key={s.position}
                            disabled={recent}
                            onClick={() =>
                              void run(
                                gagPlayer({
                                  data: { code: game.code, token, position: s.position },
                                }),
                              )
                            }
                            className={cn(
                              "rounded-xl border px-3 py-2 text-xs",
                              s.statuses.includes("baillonne")
                                ? "border-primary bg-primary/15 text-primary"
                                : "border-border bg-secondary",
                              recent && "opacity-35",
                            )}
                          >
                            {s.name || `Place ${s.position}`}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </section>
          )}

          <div className="mt-8 border-t border-border pt-4">
            <Button
              variant="danger"
              className="w-full"
              onClick={async () => {
                const dto = await endGame({ data: { code: game.code, token } });
                saveSession({ code: dto.code, host: true });
                apply(dto);
              }}
            >
              Terminer la partie
            </Button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              La partie suivante s'ouvre aussitôt avec les mêmes joueurs et un nouveau code.
              Personne n'a rien à retaper : chaque téléphone suit tout seul.
            </p>
          </div>

          {onglet === "reveals" && game.singleDevice && (
            <section className="flex flex-col gap-3">
              <div className="surface p-4">
                <h2 className="font-display text-sm font-bold">Montrer une carte</h2>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Pour la Voyante, le Chaman, la Gitane… touchez le joueur dont la carte doit être
                  vue. Elle s'affiche ici : tournez l'écran vers celui qui a le droit de la voir.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {game.seats.map((s) => (
                    <button
                      key={s.position}
                      onClick={() => setRevealFrom(revealFrom === s.position ? null : s.position)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-xs",
                        revealFrom === s.position
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-secondary",
                      )}
                    >
                      {s.name || `Place ${s.position}`}
                    </button>
                  ))}
                </div>
              </div>

              {revealFrom !== null &&
                (() => {
                  const cible = game.seats.find((x) => x.position === revealFrom);
                  const role = cible?.roleId ? ROLES_BY_ID[cible.roleId] : undefined;
                  return (
                    <div className="surface p-5 text-center">
                      <p className="mt-1 text-xs text-muted-foreground">
                        {cible?.name || `Place ${revealFrom}`}
                      </p>
                      <p className="font-display text-3xl font-black text-primary">
                        {role?.name ?? "carte inconnue"}
                      </p>
                      {role && <CampBadge camp={role.camp} className="mt-2" />}
                      <Button
                        variant="ghost"
                        className="mt-4 w-full"
                        onClick={() => setRevealFrom(null)}
                      >
                        Cacher
                      </Button>
                    </div>
                  );
                })()}
            </section>
          )}
        </>
      )}
    </main>
  );
}

/**
 * Composition ajustable depuis le salon.
 *
 * L'effectif n'étant plus décidé à l'avance, la composition doit pouvoir se
 * recoller à la dernière minute : deux retardataires arrivent, un joueur
 * s'en va, et il faut retomber sur le compte sans quitter cet écran.
 */
function Composition({
  effectif,
  selection,
  variante,
  unSeulTelephone,
  comedienCartes,
  onSelection,
  onComedien,
}: {
  effectif: number;
  selection: Record<string, number>;
  variante: string;
  unSeulTelephone: boolean;
  comedienCartes: string[];
  onSelection: (selection: Record<string, number>) => void;
  onComedien: (cartes: string[]) => void;
}) {
  const attendu = cartesAttendues(effectif, selection, variante);
  const total = Object.values(selection).reduce((a, b) => a + b, 0);
  const ecart = total - attendu;
  // Hors mode un seul téléphone : ni Renard ni Montreur d'Ours, l'ordre des
  // places n'y suit pas la table.
  const pioche = rolesDistribuables(unSeulTelephone);
  const cartesCentre = attendu - effectif;

  return (
    <div className="surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-sm font-bold">Composition</h2>
        <span
          className={cn(
            "rounded-lg border px-2 py-1 text-[11px] font-semibold",
            ecart === 0
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-destructive/50 bg-destructive/10 text-destructive",
          )}
        >
          {total} carte{total > 1 ? "s" : ""} pour {attendu}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {effectif} joueur{effectif > 1 ? "s" : ""} dans le village
        {cartesCentre > 0 ? ` · ${cartesCentre} cartes au centre pour le Voleur` : ""}
        {ecart === 0
          ? " · le compte est bon."
          : ecart > 0
            ? ` · ${ecart} carte${ecart > 1 ? "s" : ""} de trop.`
            : ` · il en manque ${-ecart}.`}
      </p>

      {/* L'ordre du livret : le village, la meute, les ambigus, puis les solitaires. */}
      {(["villageois", "loups", "ambigu", "solitaire", "special"] as const).map((camp) => {
        const duCamp = pioche.filter((r) => r.camp === camp);
        if (duCamp.length === 0) return null;
        return (
          <section key={camp} className="mt-4">
            <h3 className="text-[11px] tracking-widest text-muted-foreground uppercase">
              {CAMP_LABEL[camp]}
            </h3>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {duCamp.map((r) => {
                const n = selection[r.id] ?? 0;
                return (
                  <div
                    key={r.id}
                    className={cn(
                      "flex flex-col justify-between rounded-xl border px-3 py-2",
                      n > 0 ? "border-primary bg-primary/10" : "border-border bg-secondary",
                    )}
                  >
                    <button
                      onClick={() => onSelection(ajusterRole(selection, r.id, 1))}
                      className="min-w-0 text-left text-xs leading-tight font-semibold"
                    >
                      {r.name}
                    </button>
                    <div className="mt-2 flex items-center justify-between">
                      <button
                        onClick={() => onSelection(ajusterRole(selection, r.id, -1))}
                        disabled={n === 0}
                        aria-label={`Un ${r.name} de moins`}
                        className="h-6 w-6 rounded-lg border border-border text-xs disabled:opacity-30"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-semibold tabular-nums">
                        {n}
                      </span>
                      <button
                        onClick={() => onSelection(ajusterRole(selection, r.id, 1))}
                        aria-label={`Un ${r.name} de plus`}
                        className="h-6 w-6 rounded-lg border border-border text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {(selection["comedien"] ?? 0) > 0 && (
        <section className="mt-5 rounded-xl border border-border p-3">
          <h3 className="text-[11px] tracking-widest text-muted-foreground uppercase">
            Les trois cartes du Comédien
          </h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Elles se posent au centre de la table, face cachée. Jamais de Loup-Garou parmi elles :
            seuls des rôles du village sont proposés. {comedienCartes.length} sur 3 choisies.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {pioche
              .filter(
                (r) =>
                  r.camp === "villageois" &&
                  r.id !== "comedien" &&
                  r.id !== "villageois-villageois",
              )
              .map((r) => {
                const prise = comedienCartes.includes(r.id);
                return (
                  <button
                    key={r.id}
                    onClick={() =>
                      onComedien(
                        prise
                          ? comedienCartes.filter((x) => x !== r.id)
                          : [...comedienCartes, r.id].slice(-3),
                      )
                    }
                    className={cn(
                      "rounded-lg border px-2 py-1 text-[11px]",
                      prise
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-secondary",
                    )}
                  >
                    {r.name}
                  </button>
                );
              })}
          </div>
        </section>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {ecart < 0 && (
          <Button
            variant="ghost"
            onClick={() => onSelection(ajusterRole(selection, "simple-villageois", -ecart))}
          >
            Compléter avec {-ecart} Simple{-ecart > 1 ? "s" : ""} Villageois
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => onSelection(compositionAuto(effectif, unSeulTelephone))}
        >
          Reprendre la composition conseillée pour {effectif}
        </Button>
      </div>
    </div>
  );
}
