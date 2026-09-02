import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button, CampBadge, PageHeader, RoleSigil } from "@/components/ui-kit";
import { ROLES_BY_ID } from "@/data/roles";
import { useGame } from "@/lib/game-store";
import {
  clearReveals,
  dealCards,
  endGame,
  gagPlayer,
  hostTakeSeat,
  pushReveal,
  setCaptain,
  setDead,
  setHostState,
  setLovers,
  setPhase,
  setPublicRole,
  setSeatName,
  type HostState,
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
          "Ordre de réveil, morts, capitaine, amoureux, révélations privées et bâillon du Garde Champêtre : tout le village en un écran.",
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
  const [onglet, setOnglet] = useState<Onglet>("village");
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
    return [...ids]
      .map((id) => ROLES_BY_ID[id]!)
      .filter((r) => r && r.wakeOrder !== undefined)
      .sort((a, b) => (a.wakeOrder ?? 0) - (b.wakeOrder ?? 0));
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
        back="/"
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
                <input
                  value={s.name}
                  onChange={(e) =>
                    void run(
                      setSeatName({
                        data: { code: game.code, token, position: s.position, name: e.target.value },
                      }),
                    )
                  }
                  placeholder={s.claimed ? "Prénom" : "Place libre"}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
                />
                {!game.singleDevice && (
                  <button
                    onClick={() =>
                      void run(
                        hostTakeSeat({
                          data: { code: game.code, token, position: s.position, take: !s.mine },
                        }),
                      )
                    }
                    className={cn(
                      "rounded-lg border px-2 py-1.5 text-[11px]",
                      s.mine
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {s.mine ? "sur mon tél." : s.claimed ? "connecté" : "libre"}
                  </button>
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
                ["village", "Village"],
                ["nuit", "Nuit"],
                ["reveals", "Montrer"],
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

          {onglet === "village" && (
            <ul className="flex flex-col gap-2">
              {game.seats.map((s) => (
                <JoueurLigne
                  key={s.position}
                  seat={s}
                  loversSel={lovers}
                  onLover={(p) =>
                    setLoversSel((cur) =>
                      cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p].slice(-2),
                    )
                  }
                  onDead={(alive, cause) =>
                    void run(
                      setDead({ data: { code: game.code, token, position: s.position, alive, cause } }),
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
                        data: { code: game.code, token, position: s.position, value: !s.publicRole },
                      }),
                    )
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
                <span className="text-sm">
                  Nuit {game.night} — {game.phase}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() =>
                      void run(setPhase({ data: { code: game.code, token, phase: "jour" } }))
                    }
                  >
                    ☀️ Jour
                  </Button>
                  <Button
                    onClick={() =>
                      void run(
                        setPhase({
                          data: { code: game.code, token, phase: "nuit", night: game.night + 1 },
                        }),
                      )
                    }
                  >
                    🌙 Nuit +1
                  </Button>
                </div>
              </div>

              <div className="surface p-4">
                <h2 className="font-display text-sm font-bold">Ordre de réveil</h2>
                <ol className="mt-2 flex flex-col gap-2">
                  {ordreReveil.map((r, i) => (
                    <li key={r.id} className="flex items-center gap-3">
                      <span className="w-5 text-xs text-muted-foreground">{i + 1}</span>
                      <RoleSigil role={r} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{r.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {game.seats
                            .filter((s) => s.roleId === r.id)
                            .map((s) => `${s.name || `Place ${s.position}`}${s.alive ? "" : " †"}`)
                            .join(", ")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Le Garde Champêtre intervient toujours en dernier, juste avant le lever du jour.
                </p>
              </div>

              <SuiviPouvoirs
                seats={game.seats}
                hostState={game.hostState}
                onPatch={(patch) =>
                  void run(setHostState({ data: { code: game.code, token, patch } }))
                }
              />



              {game.seats.some((s) => s.roleId === "garde-champetre") && (
                <div className="surface p-4">
                  <h2 className="font-display text-sm font-bold">Bâillon du Garde Champêtre</h2>
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
                                gagPlayer({ data: { code: game.code, token, position: s.position } }),
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
                  Pour la Voyante, le Renard, le Médium… choisissez d'abord qui reçoit
                  l'information, puis la carte à révéler. Elle apparaît sur le téléphone du
                  joueur — s'il n'en a pas, montrez-lui simplement votre écran.
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
  loversSel,
  onLover,
  onDead,
  onCaptain,
  onPublic,
}: {
  seat: SeatDTO;
  loversSel: number[];
  onLover: (p: number) => void;
  onDead: (alive: boolean, cause?: string) => void;
  onCaptain: () => void;
  onPublic: () => void;
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
            </span>
            {seat.isCaptain && <span title="Capitaine">🎖️</span>}
            {seat.loverGroup && <span title="Amoureux">❤️</span>}
            {seat.statuses.includes("baillonne") && <span title="Bâillonné">🤐</span>}
            {role && <CampBadge camp={role.camp} />}
          </div>
          <p className="truncate text-[11px] text-muted-foreground">
            {role?.name ?? "—"}
            {seat.publicRole ? " · rôle public" : ""}
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

  const rappels = [
    aRole("salvateur") && "Salvateur : jamais deux nuits de suite la même personne.",
    aRole("infect-pere-des-loups") && "Infect Père des Loups : infection possible une seule fois.",
    aRole("ancien") && "Ancien : survit à la première attaque des Loups.",
    aRole("juge-begue") && "Juge Bègue : second vote utilisable une seule fois.",
    aRole("gitane") && "Gitane / rôles à usage unique : appelez-les quand même chaque nuit.",
  ].filter(Boolean) as string[];

  if (!aRole("sorciere") && !aRole("joueur-de-flute") && rappels.length === 0) return null;

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
