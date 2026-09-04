import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button, PageHeader, RoleArt, CampBadge } from "@/components/ui-kit";
import { ChampPrenom } from "@/components/champ-prenom";
import { CAMP_LABEL, ROLES_BY_ID } from "@/data/roles";
import { useGame } from "@/lib/game-store";
import {
  markSeen,
  setSeatName,
  thiefChoose,
  type EtatPersonnel,
  type SeatDTO,
} from "@/lib/party.functions";
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
            : `${game.phase === "nuit" ? `🌙 Nuit ${game.night}` : `☀️ Jour ${game.night}`} · ouvrez votre place pour retrouver ce que vous savez.`
        }
        back={game.isHost ? "/maitre" : undefined}
        backLabel="Tableau du Maître du Jeu"
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
              {game.status !== "lobby" && !game.singleDevice && (
                <MonEtat seat={s} etat={game.mesEtats.find((x) => x.position === s.position)} />
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

      {!seat && game.comedienCartes.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-xs tracking-widest text-muted-foreground uppercase">
            Les trois cartes du Comédien
          </h2>
          <p className="mb-3 text-[11px] text-muted-foreground">
            Posées face visible au centre : le Comédien en emprunte le pouvoir, une par nuit.
          </p>
          <ul className="flex flex-col gap-2">
            {game.comedienCartes.map((id) => {
              const r = ROLES_BY_ID[id];
              return (
                <li key={id} className="surface flex items-center gap-3 p-3">
                  <span className="text-2xl">{r?.emoji ?? "❔"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r?.name ?? id}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{r?.short}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
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
 * Ce que ce joueur sait de lui-même.
 *
 * Uniquement ce que ce joueur a fait lui-même — ses potions, sa dernière
 * protection, ses envoûtés — et ce que tout le village sait déjà. Ce qu'un
 * joueur apprend du Maître du Jeu reste sur l'écran du Maître du Jeu : son
 * aimé, le charme qu'il vient de subir, son passage côté Loups. Le
 * téléphone ne double jamais ce qui se dit d'un regard.
 */
function MonEtat({ seat, etat }: { seat: SeatDTO; etat: EtatPersonnel | undefined }) {
  const points: { cle: string; texte: string; alerte?: boolean }[] = [];

  if (!seat.alive) {
    points.push({
      cle: "mort",
      texte:
        "☠️ Vous êtes éliminé. Vous suivez la partie en silence : ni parole, ni geste, ni regard appuyé.",
      alerte: true,
    });
  }
  if (etat?.capitaine) {
    points.push({
      cle: "capitaine",
      texte:
        "🎖️ Vous portez l'écharpe : votre voix compte double, et vous désignerez votre successeur en mourant.",
    });
  }
  if (etat?.potionVie !== undefined) {
    points.push({
      cle: "vie",
      texte: etat.potionVie
        ? "🧪 Potion de vie : encore en main."
        : "🧪 Potion de vie : déjà versée, elle ne servira plus.",
    });
  }
  if (etat?.potionMort !== undefined) {
    points.push({
      cle: "mort-potion",
      texte: etat.potionMort
        ? "☠️ Potion de mort : encore en main."
        : "☠️ Potion de mort : déjà versée, elle ne servira plus.",
    });
  }
  if (etat?.protectionInterdite) {
    points.push({
      cle: "salvateur",
      texte: `🛡️ Vous ne pouvez pas reprotéger ${etat.protectionInterdite} cette nuit : c'était déjà votre choix la nuit dernière.`,
    });
  }
  if (etat?.loupBlancCetteNuit !== undefined) {
    points.push({
      cle: "blanc",
      texte: etat.loupBlancCetteNuit
        ? "🌕 Cette nuit, vous vous réveillez seul après la meute : vous pouvez dévorer un Loup-Garou."
        : "🌕 Pas de réveil solitaire cette nuit : votre pouvoir revient la nuit prochaine.",
    });
  }
  if (etat?.envoutes && etat.envoutes.length > 0) {
    points.push({
      cle: "flute",
      texte: `🎶 Déjà sous votre charme : ${etat.envoutes.join(", ")}. Il vous faut deux nouveaux noms chaque nuit.`,
    });
  }
  if (etat?.modele) {
    points.push({
      cle: "modele",
      texte: `🧒 Votre modèle est ${etat.modele}. Tant qu'il vit, vous êtes villageois ; s'il tombe, vous rejoignez la meute.`,
    });
  }
  if (etat?.chienLoup) {
    points.push({
      cle: "chien",
      texte:
        etat.chienLoup === "loups"
          ? "🐕 Vous avez choisi les Loups-Garous. Ce choix est définitif et personne ne le connaît."
          : "🐕 Vous avez choisi le village. Ce choix est définitif et personne ne le connaît.",
    });
  }
  if (etat?.pouvoirConsomme) {
    points.push({ cle: "consomme", texte: "⚪ Votre pouvoir à usage unique est déjà dépensé." });
  }
  if (etat?.baillonne) {
    points.push({
      cle: "baillon",
      texte:
        "🤐 Vous ne prononcez pas un mot pendant le débat d'aujourd'hui. Les gestes sont permis, et vous votez normalement.",
      alerte: true,
    });
  }
  if (etat?.sansVote) {
    points.push({
      cle: "sans-vote",
      texte: "🤡 Gracié par le village : vous restez en jeu, mais vous ne votez plus jamais.",
    });
  }
  if (etat?.priveDeVote) {
    points.push({
      cle: "prive",
      texte: "🐐 Le Bouc Émissaire vous prive de vote pour la journée.",
      alerte: true,
    });
  }
  if (etat?.villageSansPouvoirs) {
    points.push({
      cle: "ancien",
      texte:
        "⚰️ L'Ancien est tombé sous un coup du village : plus aucun villageois n'a de pouvoir jusqu'à la fin de la partie.",
      alerte: true,
    });
  }

  if (points.length === 0) return null;

  return (
    <ul className="mt-3 flex flex-col gap-2">
      {points.map((p) => (
        <li
          key={p.cle}
          className={cn(
            "rounded-xl border p-3 text-[11px] leading-relaxed",
            p.alerte
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-secondary text-muted-foreground",
          )}
        >
          {p.texte}
        </li>
      ))}
    </ul>
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
        {role.id === "magicien" && (
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
