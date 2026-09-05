import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button, PageHeader, RoleArt, CampBadge } from "@/components/ui-kit";
import { ChampPrenom } from "@/components/champ-prenom";
import { CAMP_LABEL, ROLES_BY_ID } from "@/data/roles";
import { useGame } from "@/lib/game-store";
import { markSeen, setSeatName, type EtatPersonnel, type SeatDTO } from "@/lib/party.functions";
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

  // Tant que les cartes ne sont pas distribuées, l'écran est celui des
  // profils : on saisit le sien, puis on regarde le village se remplir.
  const avantCartes = game.status === "lobby" || game.status === "composition";

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-10 pb-16">
      <PageHeader
        title={`Partie ${game.code}`}
        subtitle={
          avantCartes
            ? game.status === "composition"
              ? "Les cartes sont en cours de choix. Votre rôle arrivera tout seul sur cet écran."
              : "Entrez votre prénom : le Maître du Jeu vous voit arriver."
            : `${game.phase === "nuit" ? `Nuit ${game.night}` : `Jour ${game.night}`} · ouvrez votre place pour retrouver ce que vous savez.`
        }
        back={game.isHost ? "/maitre" : undefined}
        backLabel="Tableau du Maître du Jeu"
      />

      {!seat && avantCartes && (
        <>
          {(() => {
            // Un téléphone peut porter deux ou trois joueurs : on ne demande
            // qu'un prénom à la fois, celui de la personne qui a l'appareil
            // en main, et on passe au suivant une fois qu'elle a validé.
            const aRemplir = mine.find((s) => !s.name);
            if (!aRemplir) return null;
            return (
              <div className="surface p-4">
                <p className="text-xs text-muted-foreground">
                  {" "}
                  Joueur {mine.filter((s) => s.name).length + 1} sur {mine.length}
                </p>
                <h2 className="mt-1 font-display text-lg font-black">Votre prénom</h2>
                <ChampPrenom
                  valeur=""
                  onEnregistrer={(nom) => void nommer(aRemplir.position, nom)}
                  placeholder="Prénom"
                  className="mt-3 w-full"
                />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {" "}
                  Une fois validé, passez le téléphone au joueur suivant s'il y en a un. Pour
                  corriger un prénom, demandez au Maître du Jeu de libérer le profil.
                </p>
              </div>
            );
          })()}
        </>
      )}

      {!seat && game.vainqueur && (
        <div className="surface mb-4 border border-primary/40 p-5 text-center">
          <p className="font-display text-xl leading-tight font-black text-primary">
            {game.vainqueur.texte}
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {" "}
            Toutes les cartes sont retournées. Restez sur cet écran : la partie suivante s'ouvrira
            avec les mêmes joueurs.
          </p>
        </div>
      )}

      {!seat && avantCartes && !game.singleDevice && (
        <section className="mt-6">
          <h2 className="mb-2 text-xs tracking-widest text-muted-foreground uppercase">
            {" "}
            Le village · {game.seats.filter((s) => s.name).length} sur {game.seats.length}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {game.seats.map((s) => (
              <li
                key={s.position}
                className={cn(
                  "rounded-xl border px-3 py-2 text-xs",
                  s.mine
                    ? "border-primary bg-primary/15 text-primary"
                    : s.name
                      ? "border-border bg-secondary"
                      : "border-border bg-secondary text-muted-foreground italic",
                )}
              >
                {s.name || "…"}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!seat && !avantCartes && (
        <ul className="flex flex-col gap-3">
          {mine.map((s) => (
            <li key={s.position} className="surface p-4">
              <p className="text-sm font-semibold">{s.name || `Place ${s.position}`}</p>
              {/* Éliminé : sa carte est retournée sur la table, elle n'a plus
                  de raison d'être cachée sur son téléphone. */}
              {!s.alive && s.roleId ? (
                <div className="mt-3 rounded-xl border border-border bg-secondary p-4 text-center">
                  <p className="text-[11px] text-muted-foreground">
                    {" "}
                    Vous êtes éliminé — votre carte reste visible
                  </p>
                  <p className="font-display text-xl font-black text-primary">
                    {ROLES_BY_ID[s.roleId]?.name ?? "carte inconnue"}
                  </p>
                  {ROLES_BY_ID[s.roleId] && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {ROLES_BY_ID[s.roleId]!.short}
                    </p>
                  )}
                </div>
              ) : null}
              {s.alive && !s.seen && (
                <Button className="mt-3 w-full" onClick={() => void ouvrir(s)}>
                  {" "}
                  Découvrir ma carte
                </Button>
              )}
              {s.alive &&
                s.seen &&
                (game.singleDevice ? (
                  <p className="mt-3 rounded-xl border border-border bg-secondary p-3 text-center text-xs text-muted-foreground">
                    {" "}
                    Carte déjà consultée. Pour la revoir, demandez au Maître du Jeu : elle s'affiche
                    sur son écran.
                  </p>
                ) : (
                  /* Chacun a son téléphone : il peut revoir sa carte autant
                     de fois qu'il veut, sans rien demander à personne. */
                  <Button variant="ghost" className="mt-3 w-full" onClick={() => void ouvrir(s)}>
                    {" "}
                    Revoir ma carte
                  </Button>
                ))}
              {!game.singleDevice && (
                <MonEtat seat={s} etat={game.mesEtats.find((x) => x.position === s.position)} />
              )}
            </li>
          ))}
          {mine.length === 0 && (
            <li className="surface p-4 text-sm text-muted-foreground">
              {" "}
              Aucune place attribuée à cet appareil.
            </li>
          )}
        </ul>
      )}

      {seat && !revele && (
        <div className="surface card-back animate-rise flex flex-col items-center gap-4 p-8 text-center">
          <div className="text-5xl"></div>
          <p className="font-display text-xl font-bold">{seat.name || `Place ${seat.position}`}</p>
          <p className="text-xs text-muted-foreground">
            {" "}
            Assurez-vous que personne ne regarde par-dessus votre épaule.
          </p>
          <Button className="w-full" onClick={() => void voirCarte(seat)}>
            {" "}
            Retourner la carte
          </Button>
          <button
            className="text-xs text-muted-foreground underline"
            onClick={() => setActive(null)}
          >
            {" "}
            Annuler
          </button>
        </div>
      )}

      {seat && revele && seat.roleId && (
        <CarteRevelee
          seat={seat}
          onClose={() => {
            setActive(null);
            setRevele(false);
          }}
        />
      )}

      {!seat && !avantCartes && <CartesPubliques seats={game.seats} />}

      {game.voitLeCimetiere && !seat && !avantCartes && <Cimetiere seats={game.seats} />}
    </main>
  );
}

/**
 * Ce que ce joueur sait de lui-même.
 *
 * Uniquement ce que ce joueur a fait lui-même — ses potions, sa dernière
 * protection — et ce que tout le village sait déjà. Ce qu'un joueur apprend
 * du Maître du Jeu reste sur l'écran du Maître du Jeu : son aimé, le charme
 * qu'il vient de subir, la liste des envoûtés s'il joue de la flûte.
 *
 * Une seule exception : le passage côté Loups-Garous. Ce n'est pas un
 * renseignement sur les autres mais une consigne de jeu — le converti doit
 * savoir avec qui il gagne, et l'oublier fausse la fin de partie.
 */
function MonEtat({ seat, etat }: { seat: SeatDTO; etat: EtatPersonnel | undefined }) {
  const points: { cle: string; texte: string; alerte?: boolean }[] = [];

  if (!seat.alive) {
    points.push({
      cle: "mort",
      texte:
        " Vous êtes éliminé. Vous suivez la partie en silence : ni parole, ni geste, ni regard appuyé.",
      alerte: true,
    });
  }
  if (etat?.capitaine) {
    points.push({
      cle: "capitaine",
      texte:
        " Vous portez l'écharpe : votre voix compte double, et vous désignerez votre successeur en mourant.",
    });
  }
  if (etat?.potionVie !== undefined) {
    points.push({
      cle: "vie",
      texte: etat.potionVie
        ? " Potion de vie : encore en main."
        : " Potion de vie : déjà versée, elle ne servira plus.",
    });
  }
  if (etat?.potionMort !== undefined) {
    points.push({
      cle: "mort-potion",
      texte: etat.potionMort
        ? " Potion de mort : encore en main."
        : " Potion de mort : déjà versée, elle ne servira plus.",
    });
  }
  if (etat?.protectionInterdite) {
    points.push({
      cle: "salvateur",
      texte: ` Vous ne pouvez pas reprotéger ${etat.protectionInterdite} cette nuit : c'était déjà votre choix la nuit dernière.`,
    });
  }
  if (etat?.loupBlancCetteNuit !== undefined) {
    points.push({
      cle: "blanc",
      texte: etat.loupBlancCetteNuit
        ? " Cette nuit, vous vous réveillez seul après la meute : vous pouvez dévorer un Loup-Garou."
        : " Pas de réveil solitaire cette nuit : votre pouvoir revient la nuit prochaine.",
    });
  }
  if (etat?.modele) {
    points.push({
      cle: "modele",
      texte: ` Votre modèle est ${etat.modele}. Tant qu'il vit, vous êtes villageois ; s'il tombe, vous rejoignez la meute.`,
    });
  }
  if (etat?.chienLoup) {
    points.push({
      cle: "chien",
      texte:
        etat.chienLoup === "loups"
          ? " Vous avez choisi les Loups-Garous. Ce choix est définitif et personne ne le connaît."
          : " Vous avez choisi le village. Ce choix est définitif et personne ne le connaît.",
    });
  }
  if (etat?.passeCoteLoups) {
    points.push({
      cle: "converti",
      texte:
        " Vous êtes désormais du côté des Loups-Garous. Vous gardez votre pouvoir, mais vous ne gagnez plus avec le village.",
      alerte: true,
    });
  }
  if (etat?.pouvoirConsomme) {
    points.push({ cle: "consomme", texte: " Votre pouvoir à usage unique est déjà dépensé." });
  }
  if (etat?.baillonne) {
    points.push({
      cle: "baillon",
      texte:
        " Vous ne prononcez pas un mot pendant le débat d'aujourd'hui. Les gestes sont permis, et vous votez normalement.",
      alerte: true,
    });
  }
  if (etat?.sansVote) {
    points.push({
      cle: "sans-vote",
      texte: " Gracié par le village : vous restez en jeu, mais vous ne votez plus jamais.",
    });
  }
  if (etat?.priveDeVote) {
    points.push({
      cle: "prive",
      texte: " Le Bouc Émissaire vous prive de vote pour la journée.",
      alerte: true,
    });
  }
  if (etat?.villageSansPouvoirs) {
    points.push({
      cle: "ancien",
      texte:
        " L'Ancien est tombé sous un coup du village : plus aucun villageois n'a de pouvoir jusqu'à la fin de la partie.",
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
        {" "}
        Cartes connues de tous
      </h2>
      <ul className="flex flex-col gap-2">
        {publiques.map((s) => {
          const role = s.roleId ? ROLES_BY_ID[s.roleId] : undefined;
          return (
            <li key={s.position} className="surface flex items-center gap-3 p-3">
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
        {" "}
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

function CarteRevelee({ seat, onClose }: { seat: SeatDTO; onClose: () => void }) {
  const role = ROLES_BY_ID[seat.roleId!];
  if (!role) return null;

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
            {" "}
            Votre carte est publique : le Maître du Jeu annoncera à tout le village que vous êtes un
            authentique villageois.
          </p>
        )}
        {role.id === "magicien" && (
          <p className="mt-3 rounded-xl border border-border bg-secondary p-3 text-xs">
            {" "}
            Le joueur que vous bâillonnez pourra encore voter et communiquer par gestes, mais pas
            parler.
          </p>
        )}
      </div>

      <Button variant="ghost" className="w-full py-4" onClick={onClose}>
        {" "}
        J'ai compris, cacher la carte
      </Button>
    </div>
  );
}
