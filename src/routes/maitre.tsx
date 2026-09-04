import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button, LinkButton, PageHeader, RoleSigil } from "@/components/ui-kit";
import { ChampPrenom } from "@/components/champ-prenom";
import { ConduiteNuit } from "@/components/conduite-nuit";
import { CAMP_LABEL, PREMIERE_NUIT_SEULEMENT, ROLES_BY_ID } from "@/data/roles";
import { useGame } from "@/lib/game-store";
import {
  clearReveals,
  dealCards,
  endGame,
  gagPlayer,
  pushReveal,
  resetSeen,
  resolveNight,
  setCaptain,
  setDead,
  setHostState,
  setLovers,
  setPhase,
  setPublicRole,
  setNightAction,
  setSeatName,
  thiefSwap,
  type HostState,
  type NuitEnCours,
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
  const [bilan, setBilan] = useState<{
    morts: { position: number; cause: string }[];
    sauves: { position: number; raison: string }[];
    infecte: number | null;
    enfantTransforme: boolean;
  } | null>(null);

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

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-10 pb-16">
      <PageHeader
        title={game.singleDevice ? "Un seul téléphone" : `Code ${game.code}`}
        subtitle={
          game.status === "lobby"
            ? game.singleDevice
              ? `${game.playerCount} joueurs · votre appareil porte toutes les places et tourne autour de la table.`
              : `${prets}/${game.playerCount} places prises. Partagez le code, puis distribuez.`
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
                joueurs partagent son téléphone.
              </p>
            </div>
          )}

          <ul className="flex flex-col gap-2">
            {game.seats.map((s) => (
              <li key={s.position} className="surface flex items-center gap-3 p-3">
                <span className="w-6 text-xs text-muted-foreground">{s.position}</span>
                {game.singleDevice ? (
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
                    {/* En multi-appareils, chaque joueur saisit son prénom sur
                        son propre téléphone. Le MJ ne fait que regarder les
                        connexions arriver : il anime, il ne joue pas. */}
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {s.name || <span className="text-muted-foreground italic">en attente…</span>}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-lg border px-2 py-1 text-[11px]",
                        s.claimed
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {s.claimed ? "connecté" : "libre"}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>

          <Button
            className="w-full py-4"
            onClick={() => void run(dealCards({ data: { code: game.code, token } }))}
          >
            {game.singleDevice ? "Commencer la distribution" : "Distribuer les cartes"}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            {game.singleDevice
              ? "Les joueurs saisiront leur prénom et découvriront leur carte chacun leur tour sur cet appareil."
              : "Les places restées libres peuvent être portées par votre téléphone : le village fait tourner l'appareil pour ces joueurs-là."}
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
                      : "Débat et vote du village. Marquez les morts dans l'onglet Joueurs."}
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
                      onClick={() => {
                        setBilan(null);
                        void run(
                          setPhase({
                            data: { code: game.code, token, phase: "nuit", night: game.night + 1 },
                          }),
                        );
                      }}
                    >
                      🌙 Nuit suivante
                    </Button>
                  )}
                </div>
              </div>

              {bilan && (
                <BilanNuit bilan={bilan} seats={game.seats} onFermer={() => setBilan(null)} />
              )}

              {game.phase === "jour" && !bilan && (
                <div className="surface p-5">
                  <h2 className="font-display text-sm font-bold">Déroulé de la journée</h2>
                  <ol className="mt-3 flex flex-col gap-2 text-xs leading-relaxed">
                    <li>
                      <strong>1.</strong> Annoncez les morts de la nuit, sans jamais dire la cause.
                      Les éliminés retournent leur carte et ne parlent plus.
                    </li>
                    <li>
                      <strong>2.</strong> Si le Chasseur est tombé, il tire immédiatement.
                    </li>
                    <li>
                      <strong>3.</strong> Première journée seulement : faites élire le Capitaine. Sa
                      voix compte double.
                    </li>
                    <li>
                      <strong>4.</strong> Ouvrez le débat, puis le vote à main levée.
                    </li>
                    <li>
                      <strong>5.</strong> Marquez l'éliminé dans l'onglet 👥 Joueurs, avec la cause
                      « vote ».
                    </li>
                    <li>
                      <strong>6.</strong> Revenez ici et lancez la nuit suivante.
                    </li>
                  </ol>
                </div>
              )}

              {game.phase === "nuit" && (
                <ConduiteNuit
                  game={game}
                  onAction={(patch: NuitEnCours) =>
                    void run(setNightAction({ data: { code: game.code, token, patch } }))
                  }
                  onResoudre={async () => {
                    try {
                      const dto = await resolveNight({ data: { code: game.code, token } });
                      apply(dto);
                      setBilan(dto.bilan);
                      setErreur(null);
                    } catch (e) {
                      setErreur(e instanceof Error ? e.message : "Résolution impossible");
                    }
                  }}
                  onVol={(position, avec) =>
                    void run(thiefSwap({ data: { code: game.code, token, position, avec } }))
                  }
                  onBaillon={(position) =>
                    void run(gagPlayer({ data: { code: game.code, token, position } }))
                  }
                  onRevelation={(de, vers) =>
                    void run(
                      pushReveal({
                        data: { code: game.code, token, toPosition: de, targetPosition: vers },
                      }),
                    )
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

              <MontreurOurs
                seats={game.seats}
                etat={game.hostState}
                unSeulTelephone={game.singleDevice}
              />

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

/**
 * Bilan du lever du jour.
 *
 * C'est le seul écran qui dit au Maître du Jeu ce qu'il doit annoncer au
 * village, et ce qu'il doit surtout garder pour lui : une victime sauvée
 * par la Sorcière ou le Salvateur ne s'annonce jamais, sinon le village
 * apprend gratuitement qui détient ces cartes.
 */
function BilanNuit({
  bilan,
  seats,
  onFermer,
}: {
  bilan: {
    morts: { position: number; cause: string }[];
    sauves: { position: number; raison: string }[];
    infecte: number | null;
    enfantTransforme: boolean;
  };
  seats: SeatDTO[];
  onFermer: () => void;
}) {
  const nom = (p: number) => seats.find((s) => s.position === p)?.name || `Place ${p}`;
  const CAUSES: Record<string, string> = {
    loups: "dévoré par les Loups-Garous",
    poison: "empoisonné",
    chagrin: "mort de chagrin",
    "loup blanc": "égorgé par le Loup-Garou Blanc",
  };

  return (
    <div className="surface border border-primary/40 p-5">
      <h2 className="font-display text-base font-black">☀️ Lever du jour</h2>

      <p className="mt-3 text-[11px] tracking-widest text-muted-foreground uppercase">
        À annoncer au village
      </p>
      {bilan.morts.length === 0 ? (
        <p className="mt-1 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm font-semibold text-primary">
          « Cette nuit, personne n'est mort. »
        </p>
      ) : (
        <ul className="mt-1 flex flex-col gap-2">
          {bilan.morts.map((m) => (
            <li
              key={m.position}
              className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm font-semibold text-primary"
            >
              « {nom(m.position)} est mort cette nuit. » —{" "}
              <span className="font-normal">{CAUSES[m.cause] ?? m.cause}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">
        N'annoncez jamais la cause : le village doit la deviner. Les morts retournent leur carte et
        ne parlent plus.
      </p>

      {(bilan.sauves.length > 0 || bilan.infecte !== null || bilan.enfantTransforme) && (
        <>
          <p className="mt-5 text-[11px] tracking-widest text-destructive uppercase">
            Pour vous seul — ne dites rien
          </p>
          <ul className="mt-1 flex flex-col gap-1 text-xs text-muted-foreground">
            {bilan.sauves.map((s) => (
              <li key={s.position}>
                • {nom(s.position)} a survécu : {s.raison}.
              </li>
            ))}
            {bilan.infecte !== null && (
              <li>
                • Prévenez discrètement {nom(bilan.infecte)} qu'il rejoint les Loups-Garous, en
                gardant son pouvoir.
              </li>
            )}
            {bilan.enfantTransforme && (
              <li>
                • Le modèle de l'Enfant Sauvage est mort : prévenez-le qu'il devient Loup-Garou.
              </li>
            )}
          </ul>
        </>
      )}

      {bilan.morts.some(
        (m) => seats.find((s) => s.position === m.position)?.roleId === "chasseur",
      ) && (
        <p className="mt-4 rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
          🎯 Le Chasseur est mort : il tire immédiatement sur un joueur de son choix. Marquez cette
          mort depuis l'onglet Village.
        </p>
      )}

      <Button variant="ghost" className="mt-4 w-full" onClick={onFermer}>
        J'ai fait les annonces
      </Button>
    </div>
  );
}

/**
 * Montreur d'Ours : rappel actif au lever du jour.
 *
 * L'ours grogne si au moins un des deux VOISINS DIRECTS VIVANTS du Montreur
 * est un Loup-Garou. Les morts ne comptent pas : on saute jusqu'au prochain
 * joueur vivant de chaque côté de la table.
 */
function MontreurOurs({
  seats,
  etat,
  unSeulTelephone,
}: {
  seats: SeatDTO[];
  etat: HostState;
  unSeulTelephone: boolean;
}) {
  const montreur = seats.find((s) => s.roleId === "montreur-ours");
  if (!montreur || !montreur.alive) return null;

  const vivants = seats.filter((s) => s.alive);
  const index = vivants.findIndex((s) => s.position === montreur.position);
  if (index === -1 || vivants.length < 3) return null;

  const gauche = vivants[(index - 1 + vivants.length) % vivants.length]!;
  const droite = vivants[(index + 1) % vivants.length]!;

  // Un joueur infecté par l'Infect Père, un Enfant Sauvage transformé ou un
  // Chien-Loup passé côté meute comptent comme Loups-Garous, même si leur
  // carte dit autre chose.
  const convertis = etat.devenusLoups ?? [];
  const estLoup = (s: SeatDTO) => {
    const role = s.roleId ? ROLES_BY_ID[s.roleId] : undefined;
    return (
      role?.camp === "loups" || role?.id === "loup-garou-blanc" || convertis.includes(s.position)
    );
  };

  const voisins = [gauche, droite];
  // Cas particulier du livret : si le Montreur d'Ours est lui-même infecté,
  // l'ours grogne à chaque tour jusqu'à son élimination.
  const montreurInfecte = convertis.includes(montreur.position);
  const grogne = montreurInfecte || voisins.some(estLoup);
  const nom = (s: SeatDTO) => s.name || `Place ${s.position}`;

  // Avec plusieurs téléphones, l'ordre des places vient de l'ordre où les
  // appareils les ont réclamées : il n'a aucune raison de correspondre à la
  // table. Donner un verdict serait donc du hasard. On se contente de
  // rappeler au MJ de regarder ses joueurs.
  if (!unSeulTelephone) {
    const loups = vivants.filter(estLoup);
    return (
      <div className="surface border border-border p-4">
        <h2 className="font-display text-sm font-bold">🐻 Montreur d'Ours — au lever du jour</h2>
        <p className="mt-1 text-[11px] text-muted-foreground">{nom(montreur)} porte l'ours.</p>
        <p className="mt-3 rounded-xl border border-border bg-secondary p-3 text-xs">
          Regardez qui est <strong>physiquement assis</strong> de chaque côté de {nom(montreur)}. Si
          l'un des deux est côté Loups, faites grogner l'ours ; sinon l'ours reste silencieux.
        </p>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Côté Loups en ce moment : {loups.map((s) => nom(s)).join(", ") || "personne"}.
        </p>
        <p className="mt-2 text-[11px] text-muted-foreground">
          L'ordre de cette liste ne suit pas forcément votre table. Pour que l'application calcule
          elle-même le grognement, rangez la liste depuis l'écran d'attente.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("surface border p-4", grogne ? "border-destructive/60" : "border-border")}>
      <h2 className="font-display text-sm font-bold">🐻 Montreur d'Ours — au lever du jour</h2>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {nom(montreur)} · voisins vivants : {nom(gauche)} et {nom(droite)}
      </p>
      <p
        className={cn(
          "mt-3 rounded-xl border p-3 text-center font-display text-base font-black",
          grogne
            ? "border-destructive/60 bg-destructive/15 text-destructive"
            : "border-border bg-secondary text-muted-foreground",
        )}
      >
        {grogne ? "FAITES GROGNER L'OURS" : "L'ours reste silencieux"}
      </p>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {montreurInfecte
          ? "Le Montreur d'Ours est lui-même infecté : l'ours grognera à chaque tour jusqu'à son élimination."
          : "Seuls les voisins encore en jeu comptent."}
      </p>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Annoncez-le à voix haute, avant le débat, sans dire de quel côté vient le grognement. Les
        joueurs passés côté Loups en cours de partie (infection, Enfant Sauvage) sont comptés.
      </p>
    </div>
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
