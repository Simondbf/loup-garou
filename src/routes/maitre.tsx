import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button, LinkButton, PageHeader, RoleSigil } from "@/components/ui-kit";
import { ChampPrenom } from "@/components/champ-prenom";
import { ConduiteJour } from "@/components/conduite-jour";
import { ConduiteNuit } from "@/components/conduite-nuit";
import { CAMP_LABEL, PREMIERE_NUIT_SEULEMENT, ROLES_BY_ID } from "@/data/roles";
import {
  ROLES_DISTRIBUABLES,
  ajusterRole,
  cartesAttendues,
  compositionAuto,
} from "@/data/composition";
import { useGame } from "@/lib/game-store";
import {
  PLACES_MAX,
  PLACES_MIN,
  addSeat,
  clearReveals,
  dealCards,
  endGame,
  gagPlayer,
  pushReveal,
  resetSeen,
  removeSeat,
  resolveNight,
  servanteEchange,
  setCaptain,
  setDayAction,
  setDead,
  setHostState,
  setLovers,
  setPhase,
  setPublicRole,
  setNightAction,
  setSelection,
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

type Onglet = "village" | "nuit" | "reveals";

function Maitre() {
  const navigate = useNavigate();
  const { game, session, token, hydrated, apply, saveSession } = useGame();
  // Le MJ passe l'essentiel de la partie à conduire la nuit : c'est l'onglet
  // qui doit s'ouvrir en premier une fois les cartes distribuées.
  const [onglet, setOnglet] = useState<Onglet>("nuit");
  const [erreur, setErreur] = useState<string | null>(null);
  const [lovers, setLoversSel] = useState<number[]>([]);
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

  const ordreReveil = useMemo(() => {
    if (!game) return [];
    const ids = new Set(game.seats.map((s) => s.roleId).filter(Boolean) as string[]);
    // Les Amoureux se reconnaissent juste après que Cupidon se soit rendormi.
    if (ids.has("cupidon")) ids.add("amoureux");
    return [...ids]
      .map((id) => ROLES_BY_ID[id]!)
      .filter((r) => r && r.wakeOrder !== undefined)
      .filter(
        (r) =>
          game.night <= 1 ||
          !PREMIERE_NUIT_SEULEMENT.has(r.id) ||
          (r.id === "voleur" && game.thiefVariant === "echange"),
      )

      .sort((a, b) => (a.wakeOrder ?? 0) - (b.wakeOrder ?? 0));
  }, [game]);

  const rappelsJour = useMemo(() => {
    if (!game) return [];
    const ids = new Set(game.seats.map((s) => s.roleId).filter(Boolean) as string[]);
    return [...ids].map((id) => ROLES_BY_ID[id]!).filter((r) => r?.rappelJour);
  }, [game]);

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
              ? `${game.seats.length} joueurs · votre appareil porte toutes les places et tourne autour de la table.`
              : `${prets} joueur${prets > 1 ? "s" : ""} dans le village. Partagez le code, puis distribuez.`
            : `Nuit ${game.night} · ${game.phase} · ${vivants} vivants${
                game.singleDevice ? " · un seul téléphone" : ` · code ${game.code}`
              }`
        }
      />

      {erreur && <p className="mb-3 text-center text-xs text-destructive">{erreur}</p>}

      {game.status === "lobby" ? (
        <section className="flex flex-col gap-3">
          {!game.singleDevice && (
            <div className="surface p-5 text-center">
              <p className="text-xs tracking-widest text-muted-foreground uppercase">
                Code de partie
              </p>
              <p className="font-display text-5xl font-black tracking-[0.3em] text-gradient-moon">
                {game.code}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Chaque joueur ouvre l'application, choisit « Rejoindre » et indique combien de
                joueurs partagent son téléphone. Leurs prénoms apparaissent ici au fur et à mesure.
              </p>
            </div>
          )}

          <ul className="flex flex-col gap-2">
            {game.seats.map((s) => (
              <li key={s.position} className="surface flex items-center gap-3 p-3">
                <span className="w-6 text-xs text-muted-foreground">{s.position}</span>
                {game.singleDevice || s.mine ? (
                  <ChampPrenom
                    valeur={s.name}
                    onEnregistrer={(nom) =>
                      void run(
                        setSeatName({
                          data: { code: game.code, token, position: s.position, name: nom },
                        }),
                      )
                    }
                    placeholder="Prénom"
                    className="min-w-0 flex-1"
                  />
                ) : (
                  <>
                    {/* Chaque joueur saisit son prénom sur son propre téléphone.
                        Le MJ regarde les connexions arriver : il anime, il ne
                        joue pas. Il peut en revanche écarter quelqu'un. */}
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {s.name || <span className="text-muted-foreground italic">en attente…</span>}
                    </span>
                    <span className="shrink-0 rounded-lg border border-primary/50 bg-primary/10 px-2 py-1 text-[11px] text-primary">
                      connecté
                    </span>
                  </>
                )}
                {!game.singleDevice && (
                  <button
                    onClick={() =>
                      void run(
                        removeSeat({ data: { code: game.code, token, position: s.position } }),
                      )
                    }
                    aria-label={`Retirer ${s.name || `la place ${s.position}`}`}
                    className="shrink-0 rounded-lg border border-border px-2 py-1 text-[11px] text-muted-foreground"
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
            {game.seats.length === 0 && (
              <li className="surface p-4 text-center text-xs text-muted-foreground">
                Le village est encore vide. Donnez le code à voix haute.
              </li>
            )}
          </ul>

          {!game.singleDevice && (
            <>
              <Button
                variant="ghost"
                className="w-full"
                disabled={game.seats.length >= PLACES_MAX}
                onClick={() => void run(addSeat({ data: { code: game.code, token } }))}
              >
                ➕ Ajouter un joueur sans téléphone
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                Sa carte s'ouvrira sur votre écran : vous la lui montrerez à l'abri des regards.
              </p>

              <Composition
                effectif={game.seats.length}
                selection={game.selection}
                variante={game.thiefVariant}
                onSelection={(selection) =>
                  void run(setSelection({ data: { code: game.code, token, selection } }))
                }
              />
            </>
          )}

          <Button
            className="w-full py-4"
            disabled={!game.singleDevice && !distributionPossible}
            onClick={() => void run(dealCards({ data: { code: game.code, token } }))}
          >
            {game.singleDevice ? "Commencer la distribution" : "Distribuer les cartes"}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            {game.singleDevice
              ? "Les joueurs saisiront leur prénom et découvriront leur carte chacun leur tour sur cet appareil."
              : game.seats.length < PLACES_MIN
                ? `Attendez au moins ${PLACES_MIN} joueurs.`
                : "Une fois les cartes distribuées, plus personne ne peut rejoindre la partie."}
          </p>
        </section>
      ) : (
        <>
          <div className="mb-4 flex gap-2">
            {(
              [
                ["nuit", "🌙 Conduire"],
                ["village", "👥 Joueurs"],
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

          {onglet === "village" && (
            <ul className="flex flex-col gap-2">
              {game.seats.map((s) => (
                <JoueurLigne
                  key={s.position}
                  seat={s}
                  converti={(game.hostState.devenusLoups ?? []).includes(s.position)}
                  loversSel={lovers}
                  onLover={(p) =>
                    setLoversSel((cur) =>
                      cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p].slice(-2),
                    )
                  }
                  onDead={(alive, cause) =>
                    void run(
                      setDead({
                        data: { code: game.code, token, position: s.position, alive, cause },
                      }),
                    )
                  }
                  onCaptain={() =>
                    void run(
                      setCaptain({
                        data: { code: game.code, token, position: s.isCaptain ? null : s.position },
                      }),
                    )
                  }
                  onPublic={() =>
                    void run(
                      setPublicRole({
                        data: {
                          code: game.code,
                          token,
                          position: s.position,
                          value: !s.publicRole,
                        },
                      }),
                    )
                  }
                  onRouvrir={() =>
                    void run(resetSeen({ data: { code: game.code, token, position: s.position } }))
                  }
                />
              ))}
              <li className="surface p-3">
                <p className="text-xs text-muted-foreground">
                  Amoureux sélectionnés : {lovers.join(" & ") || "aucun"}
                </p>
                <Button
                  variant="ghost"
                  className="mt-2 w-full"
                  disabled={lovers.length !== 2}
                  onClick={() =>
                    void run(setLovers({ data: { code: game.code, token, positions: lovers } }))
                  }
                >
                  Lier ces deux joueurs (ils mourront ensemble)
                </Button>
              </li>
            </ul>
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
                <div className="flex gap-2">
                  {game.phase === "nuit" ? (
                    <Button
                      variant="ghost"
                      onClick={() =>
                        void run(setPhase({ data: { code: game.code, token, phase: "jour" } }))
                      }
                    >
                      ☀️ Jour
                    </Button>
                  ) : (
                    <Button
                      onClick={() =>
                        void run(
                          setPhase({
                            data: { code: game.code, token, phase: "nuit", night: game.night + 1 },
                          }),
                        )
                      }
                    >
                      🌙 Nuit suivante
                    </Button>
                  )}
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

              <details className="surface p-4">
                <summary className="cursor-pointer font-display text-sm font-bold">
                  Vue d'ensemble de l'ordre d'appel
                </summary>
                <ol className="mt-3 flex flex-col gap-2">
                  {ordreReveil.map((r, i) => {
                    const echangeur = r.id === "voleur" && game.thiefVariant === "echange";
                    const premiereNuit = PREMIERE_NUIT_SEULEMENT.has(r.id) && !echangeur;
                    return (
                      <li key={r.id} className="flex items-center gap-3">
                        <span className="w-5 text-xs text-muted-foreground">{i + 1}</span>
                        <RoleSigil role={r} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {r.name}
                            {echangeur && (
                              <span className="ml-2 rounded-full border border-border px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                                chaque nuit
                              </span>
                            )}
                            {premiereNuit && (
                              <span className="ml-2 rounded-full border border-border px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                                1re nuit
                              </span>
                            )}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {game.seats
                              .filter((s) => s.roleId === r.id)
                              .map(
                                (s) => `${s.name || `Place ${s.position}`}${s.alive ? "" : " †"}`,
                              )
                              .join(", ")}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </details>

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

              {rappelsJour.length > 0 && (
                <details className="surface p-4">
                  <summary className="cursor-pointer font-display text-sm font-bold">
                    Pouvoirs de jour et déclenchements à la mort
                  </summary>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Ces rôles n'ont pas d'appel de nuit, mais se déclenchent au vote ou à la mort
                    d'un joueur. Gardez-les en tête.
                  </p>
                  <ul className="mt-3 flex flex-col gap-3">
                    {rappelsJour.map((r) => (
                      <li key={r.id} className="flex items-start gap-3">
                        <RoleSigil role={r} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{r.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {game.seats
                              .filter((s) => s.roleId === r.id)
                              .map(
                                (s) => `${s.name || `Place ${s.position}`}${s.alive ? "" : " †"}`,
                              )
                              .join(", ")}
                          </p>
                          <p className="mt-1 text-[11px] leading-relaxed">{r.rappelJour}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </details>
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

              <SuiviPouvoirs
                seats={game.seats}
                hostState={game.hostState}
                onPatch={(patch) =>
                  void run(setHostState({ data: { code: game.code, token, patch } }))
                }
              />

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

              <Button
                variant="danger"
                className="w-full"
                onClick={async () => {
                  await endGame({ data: { code: game.code, token } });
                  saveSession(null);
                  await navigate({ to: "/" });
                }}
              >
                Terminer la partie
              </Button>
            </section>
          )}

          {onglet === "reveals" && (
            <section className="flex flex-col gap-3">
              <div className="surface p-4">
                <h2 className="font-display text-sm font-bold">Montrer une carte</h2>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Pour la Voyante, le Chaman, la Gitane… choisissez d'abord qui reçoit
                  l'information, puis la carte à révéler. Elle apparaît sur le téléphone du joueur —
                  s'il n'en a pas, montrez-lui simplement votre écran.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {game.seats.map((s) => (
                    <button
                      key={s.position}
                      onClick={() => setRevealFrom(s.position)}
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
                {revealFrom && (
                  <>
                    <p className="mt-4 text-xs text-muted-foreground">Carte de quel joueur ?</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {game.seats
                        .filter((s) => s.position !== revealFrom)
                        .map((s) => (
                          <button
                            key={s.position}
                            onClick={() =>
                              void run(
                                pushReveal({
                                  data: {
                                    code: game.code,
                                    token,
                                    toPosition: revealFrom,
                                    targetPosition: s.position,
                                  },
                                }),
                              )
                            }
                            className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs"
                          >
                            {s.name || `Place ${s.position}`}
                          </button>
                        ))}
                    </div>
                  </>
                )}
              </div>

              <div className="surface p-4">
                <h2 className="font-display text-sm font-bold">Informations envoyées</h2>
                <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                  {game.reveals.map((r) => (
                    <li key={r.id}>
                      Place {r.toPosition} ← place {r.targetPosition} : {r.note}
                    </li>
                  ))}
                  {game.reveals.length === 0 && <li>Aucune pour l'instant.</li>}
                </ul>
                <Button
                  variant="ghost"
                  className="mt-3 w-full"
                  onClick={() => void run(clearReveals({ data: { code: game.code, token } }))}
                >
                  Effacer
                </Button>
              </div>
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
  onSelection,
}: {
  effectif: number;
  selection: Record<string, number>;
  variante: string;
  onSelection: (selection: Record<string, number>) => void;
}) {
  const attendu = cartesAttendues(effectif, selection, variante);
  const total = Object.values(selection).reduce((a, b) => a + b, 0);
  const ecart = total - attendu;
  const enJeu = ROLES_DISTRIBUABLES.filter((r) => (selection[r.id] ?? 0) > 0);
  const absents = ROLES_DISTRIBUABLES.filter((r) => !(selection[r.id] ?? 0));
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

      <ul className="mt-3 flex flex-col gap-1.5">
        {enJeu.map((r) => (
          <li key={r.id} className="flex items-center gap-2">
            <span className="text-base">{r.emoji}</span>
            <span className="min-w-0 flex-1 truncate text-xs">{r.name}</span>
            <button
              onClick={() => onSelection(ajusterRole(selection, r.id, -1))}
              aria-label={`Un ${r.name} de moins`}
              className="h-7 w-7 rounded-lg border border-border text-sm"
            >
              −
            </button>
            <span className="w-5 text-center font-display text-sm font-black">
              {selection[r.id]}
            </span>
            <button
              onClick={() => onSelection(ajusterRole(selection, r.id, 1))}
              aria-label={`Un ${r.name} de plus`}
              className="h-7 w-7 rounded-lg border border-border text-sm"
            >
              +
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-col gap-2">
        {ecart < 0 && (
          <Button
            variant="ghost"
            onClick={() => onSelection(ajusterRole(selection, "simple-villageois", -ecart))}
          >
            Compléter avec {-ecart} Simple{-ecart > 1 ? "s" : ""} Villageois
          </Button>
        )}
        <Button variant="ghost" onClick={() => onSelection(compositionAuto(effectif))}>
          Reprendre la composition conseillée pour {effectif}
        </Button>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-[11px] text-primary">Ajouter un rôle</summary>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {absents.map((r) => (
            <button
              key={r.id}
              onClick={() => onSelection(ajusterRole(selection, r.id, 1))}
              className="rounded-lg border border-border bg-secondary px-2 py-1 text-[11px]"
            >
              {r.emoji} {r.name}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}

function JoueurLigne({
  seat,
  converti,
  loversSel,
  onLover,
  onDead,
  onCaptain,
  onPublic,
  onRouvrir,
}: {
  seat: SeatDTO;
  converti: boolean;
  loversSel: number[];
  onLover: (p: number) => void;
  onDead: (alive: boolean, cause?: string) => void;
  onCaptain: () => void;
  onPublic: () => void;
  onRouvrir: () => void;
}) {
  const role = seat.roleId ? ROLES_BY_ID[seat.roleId] : undefined;
  return (
    <li className={cn("surface p-3", !seat.alive && "opacity-50")}>
      <div className="flex items-center gap-3">
        {role && <RoleSigil role={role} size="sm" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">
              {seat.name || `Place ${seat.position}`}
              <span className="text-muted-foreground"> — </span>
              <span className="font-display font-black text-primary">
                {role?.name ?? "carte non distribuée"}
              </span>
            </span>
            {converti && <span title="Passé côté Loups-Garous">🩸</span>}
            {seat.isCaptain && <span title="Capitaine">🎖️</span>}
            {seat.loverGroup && <span title="Amoureux">❤️</span>}
            {seat.statuses.includes("sans-vote") && (
              <span title="Idiot gracié : ne vote plus">🤡</span>
            )}
            {seat.statuses.includes("baillonne") && (
              <span title="Bâillonné (gestes autorisés)">🤐</span>
            )}
          </div>
          <p className="truncate text-[11px] text-muted-foreground">
            {converti ? "Loups-Garous (converti)" : role ? CAMP_LABEL[role.camp] : "—"}
            {seat.publicRole ? " · rôle public" : ""}
            {role?.id === "villageois-villageois" && !seat.publicRole
              ? " · à annoncer au village"
              : ""}
            {seat.statuses.includes("sans-vote") ? " · gracié, sans droit de vote" : ""}
            {!seat.alive ? ` · mort (${seat.deathCause})` : ""}
          </p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {seat.alive ? (
          <>
            <Mini onClick={() => onDead(false, "loups")}>🐺 dévoré</Mini>
            <Mini onClick={() => onDead(false, "vote")}>🗳️ éliminé</Mini>
            <Mini onClick={() => onDead(false, "poison")}>🧪 poison</Mini>
            <Mini onClick={() => onDead(false, "chasseur")}>🎯 tir</Mini>
          </>
        ) : (
          <Mini onClick={() => onDead(true)}>↩️ ressusciter</Mini>
        )}
        <Mini onClick={onCaptain}>{seat.isCaptain ? "retirer capitaine" : "🎖️ capitaine"}</Mini>
        <Mini onClick={onPublic}>{seat.publicRole ? "cacher rôle" : "👁️ rôle public"}</Mini>
        <Mini onClick={() => onLover(seat.position)} active={loversSel.includes(seat.position)}>
          ❤️ amoureux
        </Mini>
        {seat.seen && <Mini onClick={onRouvrir}>🔓 rouvrir sa carte</Mini>}
      </div>
    </li>
  );
}

function Mini({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg border px-2 py-1 text-[11px]",
        active ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary",
      )}
    >
      {children}
    </button>
  );
}

/** Suivi privé du MJ : potions de la Sorcière, envoûtés du Joueur de Flûte,
 *  pouvoirs à usage unique ou à rechargement. */
function SuiviPouvoirs({
  seats,
  hostState,
  onPatch,
}: {
  seats: SeatDTO[];
  hostState: HostState;
  onPatch: (patch: HostState) => void;
}) {
  const aRole = (id: string) => seats.some((s) => s.roleId === id);
  const charmed = hostState.charmed ?? [];
  const lastUsed = hostState.lastUsed ?? {};

  const utilises = hostState.pouvoirsUtilises ?? [];
  // Pouvoirs qui ne servent qu'une fois dans la partie, ou qui peuvent se
  // perdre. Sans suivi, c'est au MJ de s'en souvenir de tête pendant deux
  // heures — c'est exactement ce qu'on oublie.
  const USAGE_UNIQUE: [string, string][] = [
    ["infect-pere-des-loups", "Infection"],
    ["juge-begue", "Second vote"],
    ["assassin", "Coup de poignard"],
    ["prete", "Eau bénite"],
    ["loup-feral", "Transformation"],
    ["servante-devouee", "Échange de carte"],
    ["renard", "Pouvoir (perdu sur un « non »)"],
    ["chevalier-epee-rouillee", "Gangrène"],
  ];
  const uniques = USAGE_UNIQUE.filter(([id]) => aRole(id));

  const rappels = [
    aRole("salvateur") && "Salvateur : jamais deux nuits de suite la même personne.",
    aRole("infect-pere-des-loups") && "Infect Père des Loups : infection possible une seule fois.",
    aRole("ancien") && "Ancien : survit à la première attaque des Loups.",
    aRole("juge-begue") && "Juge Bègue : second vote utilisable une seule fois.",
    aRole("gitane") && "Gitane / rôles à usage unique : appelez-les quand même chaque nuit.",
  ].filter(Boolean) as string[];

  if (
    !aRole("sorciere") &&
    !aRole("joueur-de-flute") &&
    rappels.length === 0 &&
    uniques.length === 0
  )
    return null;

  return (
    <div className="surface p-4">
      <h2 className="font-display text-sm font-bold">Suivi des pouvoirs</h2>

      {aRole("sorciere") && (
        <div className="mt-3">
          <p className="text-[11px] text-muted-foreground">Potions de la Sorcière</p>
          <div className="mt-2 flex gap-2">
            {(
              [
                ["potionVie", "🧪 Potion de vie"],
                ["potionMort", "☠️ Potion de mort"],
              ] as const
            ).map(([cle, label]) => {
              const dispo = hostState[cle] !== false;
              return (
                <button
                  key={cle}
                  onClick={() => onPatch({ [cle]: !dispo } as HostState)}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2 text-xs font-semibold",
                    dispo
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-secondary text-muted-foreground line-through",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Touchez une potion quand elle est consommée.
          </p>
        </div>
      )}

      {aRole("joueur-de-flute") && (
        <div className="mt-4">
          <p className="text-[11px] text-muted-foreground">
            Joueurs envoûtés ({charmed.length}) — réveillez-les ensemble après le Joueur de Flûte.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {seats
              .filter((s) => s.alive)
              .map((s) => {
                const on = charmed.includes(s.position);
                return (
                  <button
                    key={s.position}
                    onClick={() =>
                      onPatch({
                        charmed: on
                          ? charmed.filter((p) => p !== s.position)
                          : [...charmed, s.position],
                      })
                    }
                    className={cn(
                      "rounded-xl border px-3 py-2 text-xs",
                      on
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-secondary",
                    )}
                  >
                    🎶 {s.name || `Place ${s.position}`}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {uniques.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] text-muted-foreground">
            Pouvoirs à usage unique — touchez quand c'est consommé
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {uniques.map(([id, label]) => {
              const consomme = utilises.includes(id);
              return (
                <button
                  key={id}
                  onClick={() =>
                    onPatch({
                      pouvoirsUtilises: consomme
                        ? utilises.filter((x) => x !== id)
                        : [...utilises, id],
                    })
                  }
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs",
                    consomme
                      ? "border-border bg-secondary text-muted-foreground line-through"
                      : "border-primary bg-primary/15 text-primary",
                  )}
                >
                  {ROLES_BY_ID[id]?.emoji} {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {rappels.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1">
          {rappels.map((r) => (
            <li key={r} className="text-[11px] text-muted-foreground">
              • {r}
            </li>
          ))}
        </ul>
      )}

      {Object.keys(lastUsed).length > 0 && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Derniers usages :{" "}
          {Object.entries(lastUsed)
            .map(([id, n]) => `${ROLES_BY_ID[id]?.name ?? id} (nuit ${n})`)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}
