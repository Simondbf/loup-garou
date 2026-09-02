import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button, PageHeader, RoleArt, CampBadge } from "@/components/ui-kit";
import { ROLES_BY_ID } from "@/data/roles";
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
                {s.seen && <span className="text-[11px] text-primary">carte vue</span>}
              </div>
              <input
                value={s.name}
                onChange={(e) => void nommer(s.position, e.target.value)}
                placeholder="Prénom"
                className="mt-2 w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              {game.status !== "lobby" && (
                <Button className="mt-3 w-full" onClick={() => void ouvrir(s)}>
                  {s.seen ? "Revoir ma carte" : "Découvrir ma carte"}
                </Button>
              )}
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
          <button className="text-xs text-muted-foreground underline" onClick={() => setActive(null)}>
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
          seats={game.seats}
          onApply={apply}
          onClose={() => {
            setActive(null);
            setRevele(false);
          }}
        />
      )}

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

function CarteRevelee({
  seat,
  code,
  token,
  centerCards,
  seats,
  onApply,
  onClose,
}: {
  seat: SeatDTO;
  code: string;
  token: string;
  centerCards: string[];
  seats: SeatDTO[];
  onApply: (dto: Awaited<ReturnType<typeof thiefChoose>>) => void;
  onClose: () => void;
}) {
  const role = ROLES_BY_ID[seat.roleId!];
  if (!role) return null;
  const voleurCentre = role.id === "voleur" && centerCards.length > 0;
  const voleurEchange = role.id === "voleur" && centerCards.length === 0;

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
            Votre carte est publique : le Maître du Jeu annoncera à tout le village que vous êtes
            un authentique villageois.
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

      {voleurEchange && (
        <div className="surface p-4">
          <p className="font-display text-sm font-bold">Voler la carte d'un joueur</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {seats
              .filter((s) => s.position !== seat.position)
              .map((s) => (
                <button
                  key={s.position}
                  onClick={() =>
                    void thiefChoose({
                      data: { code, token, position: seat.position, swapWith: s.position },
                    }).then(onApply)
                  }
                  className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs"
                >
                  {s.name || `Place ${s.position}`}
                </button>
              ))}
          </div>
        </div>
      )}

      <Button variant="ghost" className="w-full py-4" onClick={onClose}>
        J'ai compris, cacher la carte
      </Button>
    </div>
  );
}
