import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button, PageHeader, RoleArt, CampBadge } from "@/components/ui-kit";
import { ChampPrenom } from "@/components/champ-prenom";
import { CAMP_LABEL, ROLES_BY_ID } from "@/data/roles";
import { useGame } from "@/lib/game-store";
import { markSeen, setSeatName, thiefChoose, type SeatDTO } from "@/lib/party.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/distribution")({
  head: () => ({
    meta: [
      { title: "Ma carte secrète — partie de Loup-Garou" },
      {
        name: "description",
        content:
          "Entrez votre prénom, découvrez votre rôle en secret et lisez son pouvoir avant de passer le téléphone.",
      },
      { property: "og:title", content: "Ma carte secrète de Loup-Garou" },
      {
        property: "og:description",
        content: "Chaque joueur découvre sa carte à son tour, à l'abri des regards.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EcranJoueur,
});

function EcranJoueur() {
  const navigate = useNavigate();
  const { game, session, token, hydrated, apply, refresh } = useGame();
  const [active, setActive] = useState<number | null>(null);
  const [revele, setRevele] = useState(false);

  useEffect(() => {
    if (hydrated && !session) void navigate({ to: "/rejoindre" });
  }, [hydrated, session, navigate]);

  if (!game) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-16 text-center">
        <p className="text-sm text-muted-foreground">Connexion à la partie…</p>
      </main>
    );
  }

  const mine = game.seats.filter((s) => game.mySeats.includes(s.position));
  const seat = mine.find((s) => s.position === active) ?? null;

  async function nommer(position: number, name: string) {
    apply(await setSeatName({ data: { code: game!.code, token, position, name } }));
  }

  // Une carte déjà consultée reste verrouillée : sur un téléphone partagé,
  // c'est ce qui empêche le joueur suivant de repasser en revue toutes les
  // places. Le Maître du Jeu peut la rouvrir depuis son écran.

  async function ouvrir(s: SeatDTO) {
    setActive(s.position);
    setRevele(false);
    await refresh();
  }

  async function voirCarte(s: SeatDTO) {
    setRevele(true);
    apply(await markSeen({ data: { code: game!.code, token, position: s.position } }));
  }

  const revealsPourMoi = game.reveals.filter((r) => game.mySeats.includes(r.toPosition));

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-10 pb-16">
      <PageHeader
        title={`Partie ${game.code}`}
        subtitle={
          game.status === "lobby"
            ? "En attente du Maître du Jeu : renseignez déjà les prénoms."
            : "Chacun son tour : ouvrez votre place, regardez votre carte, passez le téléphone."
        }
        back="/"
      />

      {!seat && (
        <ul className="flex flex-col gap-3">
          {mine.map((s) => (
            <li key={s.position} className="surface p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">Place {s.position}</span>
                {s.seen && <span className="text-[11px] text-muted-foreground">🔒 carte vue</span>}
              </div>
              <ChampPrenom
                valeur={s.name}
                onEnregistrer={(nom) => void nommer(s.position, nom)}
                placeholder="Prénom"
                className="mt-2 w-full"
              />
              {game.status !== "lobby" && !s.seen && s.name && (
                <p className="mt-3 text-center text-[11px] text-primary">
                  Votre carte a peut-être changé : ouvrez-la de nouveau.
                </p>
              )}
              {game.status !== "lobby" &&
                (s.seen ? (
                  <p className="mt-3 rounded-xl border border-border bg-secondary p-3 text-center text-xs text-muted-foreground">
                    🔒 Carte déjà consultée. Pour la revoir, demandez au Maître du Jeu de la
                    rouvrir.
                  </p>
                ) : (
                  <Button className="mt-3 w-full" onClick={() => void ouvrir(s)}>
                    Découvrir ma carte
                  </Button>
                ))}
            </li>
          ))}
          {mine.length === 0 && (
            <li className="surface p-4 text-sm text-muted-foreground">
              Aucune place attribuée à cet appareil.
            </li>
          )}
        </ul>
      )}

      {seat && !revele && (
        <div className="surface card-back animate-rise flex flex-col items-center gap-4 p-8 text-center">
          <div className="text-5xl">🌑</div>
          <p className="font-display text-xl font-bold">{seat.name || `Place ${seat.position}`}</p>
          <p className="text-xs text-muted-foreground">
            Assurez-vous que personne ne regarde par-dessus votre épaule.
          </p>
          <Button className="w-full" onClick={() => void voirCarte(seat)}>
            Retourner la carte
          </Button>
          <button
            className="text-xs text-muted-foreground underline"
            onClick={() => setActive(null)}
          >
            Annuler
          </button>
        </div>
      )}

      {seat && revele && seat.roleId && (
        <CarteRevelee
          seat={seat}
          code={game.code}
          token={token}
          centerCards={game.centerCards}
          onApply={apply}
          onClose={() => {
            setActive(null);
            setRevele(false);
          }}
        />
      )}

      {!seat && <CartesPubliques seats={game.seats} />}

      {game.voitLeCimetiere && !seat && <Cimetiere seats={game.seats} />}

      {revealsPourMoi.length > 0 && !seat && (
        <section className="mt-8">
          <h2 className="mb-2 text-xs tracking-widest text-muted-foreground uppercase">
            Informations reçues
          </h2>
          <ul className="flex flex-col gap-2">
            {revealsPourMoi.map((r) => (
              <li key={r.id} className="surface p-3 text-sm">
                Place {r.targetPosition} :{" "}
                <span className="font-display font-bold text-primary">{r.note}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

/**
 * Cartes que toute la table connaît.
 *
 * Le Villageois-Villageois a deux faces de villageois : son innocence est
 * publique par nature. L'Idiot du Village gracié révèle aussi sa carte. Les
 * afficher sur chaque téléphone évite au Maître du Jeu une annonce orale
 * que les joueurs novices comprennent mal.
 */
function CartesPubliques({ seats }: { seats: SeatDTO[] }) {
  const publiques = seats.filter((s) => s.publicRole && s.roleId);
  if (publiques.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-2 text-xs tracking-widest text-muted-foreground uppercase">
        Cartes connues de tous
      </h2>
      <ul className="flex flex-col gap-2">
        {publiques.map((s) => {
          const role = s.roleId ? ROLES_BY_ID[s.roleId] : undefined;
          return (
            <li key={s.position} className="surface flex items-center gap-3 p-3">
              <span className="text-2xl">{role?.emoji ?? "❔"}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {s.name || `Place ${s.position}`}
                  <span className="text-muted-foreground"> — </span>
                  <span className="font-display font-black text-primary">{role?.name}</span>
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {s.statuses.includes("sans-vote")
                    ? "Gracié par le village : il reste en jeu mais ne vote plus."
                    : "Sa carte est publique : la table entière sait qui il est."}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Cimetière — réservé aux joueurs éliminés.
 *
 * Dans une partie physique, un joueur mort garde les yeux ouverts et suit
 * tout. Ici il retrouve la liste des cartes tombées, mise à jour en direct :
 * il peut se rendre compte lui-même que la partie est jouée, même si le
 * Maître du Jeu tarde à l'annoncer.
 */
function Cimetiere({ seats }: { seats: SeatDTO[] }) {
  const morts = seats.filter((s) => !s.alive);
  const vivants = seats.length - morts.length;
  // Les joueurs n'ont droit qu'au moment de la mort. Savoir si quelqu'un est
  // tombé sous le poison plutôt que sous les crocs révélerait la présence de
  // la Sorcière : le détail reste au Maître du Jeu.
  const MOMENT: Record<string, string> = {
    nuit: "mort pendant la nuit",
    jour: "éliminé pendant le jour",
    chasseur: "abattu par le Chasseur",
  };

  return (
    <section className="mt-8">
      <h2 className="mb-1 text-xs tracking-widest text-muted-foreground uppercase">Cimetière</h2>
      <p className="mb-3 text-[11px] text-muted-foreground">
        Vous êtes éliminé : vous voyez maintenant les cartes tombées, en direct. Ne dites rien aux
        vivants — ni à voix haute, ni par gestes.
      </p>

      {morts.length === 0 ? (
        <p className="surface p-3 text-sm text-muted-foreground">Personne n'est encore tombé.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {morts.map((s) => {
            const role = s.roleId ? ROLES_BY_ID[s.roleId] : undefined;
            return (
              <li key={s.position} className="surface flex items-center gap-3 p-3">
                <span className="text-2xl">{role?.emoji ?? "❔"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {s.name || `Place ${s.position}`}
                    <span className="text-muted-foreground"> — </span>
                    <span className="font-display font-black text-primary">
                      {role?.name ?? "carte inconnue"}
                    </span>
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {role ? CAMP_LABEL[role.camp] : "—"}
                    {s.deathPhase ? ` · ${MOMENT[s.deathPhase] ?? ""}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        {vivants} joueur{vivants > 1 ? "s" : ""} encore en vie sur {seats.length}.
      </p>
    </section>
  );
}

function CarteRevelee({
  seat,
  code,
  token,
  centerCards,
  onApply,
  onClose,
}: {
  seat: SeatDTO;
  code: string;
  token: string;
  centerCards: string[];
  onApply: (dto: Awaited<ReturnType<typeof thiefChoose>>) => void;
  onClose: () => void;
}) {
  const role = ROLES_BY_ID[seat.roleId!];
  if (!role) return null;
  // Variante « cartes au centre » seulement : le vol de rôle est piloté par
  // le Maître du Jeu depuis son écran, comme toutes les actions de la nuit.
  const voleurCentre = role.id === "voleur" && centerCards.length > 0;

  return (
    <div className="animate-flip-in flex flex-col gap-4">
      <RoleArt role={role} className="aspect-[3/4]" />
      <div className="surface p-4">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl font-black">{role.name}</h2>
          <CampBadge camp={role.camp} />
        </div>
        <p className="mt-2 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm font-semibold text-primary">
          {role.short}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{role.description}</p>
        {role.id === "villageois-villageois" && (
          <p className="mt-3 rounded-xl border border-border bg-secondary p-3 text-xs">
            Votre carte est publique : le Maître du Jeu annoncera à tout le village que vous êtes un
            authentique villageois.
          </p>
        )}
        {role.id === "garde-champetre" && (
          <p className="mt-3 rounded-xl border border-border bg-secondary p-3 text-xs">
            Le joueur que vous bâillonnez pourra encore voter et communiquer par gestes, mais pas
            parler.
          </p>
        )}
      </div>

      {voleurCentre && (
        <div className="surface p-4">
          <p className="font-display text-sm font-bold">Deux cartes au centre</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {centerCards.map((cid: string, i: number) => {
              const r = ROLES_BY_ID[cid];
              return (
                <button
                  key={`${cid}-${i}`}
                  onClick={() =>
                    void thiefChoose({
                      data: { code, token, position: seat.position, centerRoleId: cid },
                    }).then(onApply)
                  }
                  className={cn("text-left")}
                >
                  {r && <RoleArt role={r} className="aspect-[3/4]" />}
                  <p className="mt-1 text-center text-xs text-muted-foreground">Prendre</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Button variant="ghost" className="w-full py-4" onClick={onClose}>
        J'ai compris, cacher la carte
      </Button>
    </div>
  );
}
