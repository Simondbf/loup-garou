import { useMemo } from "react";
import { BoutonAide } from "@/components/conduite-nuit";
import { Button, CampBadge, RoleSigil } from "@/components/ui-kit";
import { ROLES_BY_ID, type Role } from "@/data/roles";
import { useConseils } from "@/lib/conseils";
import type { GameDTO, HostState, PatchJour, SeatDTO, TourDeVote } from "@/lib/party.functions";
import { cn } from "@/lib/utils";

/**
 * Conduite de la journée, un écran par étape.
 *
 * Le jour n'a rien à cacher : contrairement à la nuit, où tout est mis de
 * côté pour être résolu d'un coup au petit matin, chaque mort du jour prend
 * effet immédiatement et sous les yeux de tous. Le fil ne sert donc pas à
 * différer des actions, mais à ne rien oublier de ce qui s'enchaîne.
 *
 * Et il s'en enchaîne beaucoup. Un vote élimine un joueur ; ce joueur était
 * Chasseur, il tire ; sa balle touche un Amoureux, dont l'aimé meurt de
 * chagrin ; cet aimé portait l'écharpe, il faut lui désigner un successeur.
 * Chaque mort ajoute donc ses propres étapes au fil, à la suite des autres,
 * et chacune se valide avant de passer à la suivante.
 *
 * Le principe est le même qu'à la conduite de nuit : on touche pour
 * choisir, on valide pour appliquer. Tant que la décision attendue n'est
 * pas prise, « Suivant » reste inactif.
 */

interface EtapeJour {
  /** Identifiant stable : c'est lui qui retient qu'une étape est franchie. */
  id: string;
  emoji: string;
  titre: string;
  /** Rôle concerné, quand l'étape en a un. */
  role?: Role;
  /** Phrase à lire à voix haute. */
  annonce?: string;
  consigne: string;
  /** Aide-mémoire, pour un Maître du Jeu qui découvre le rôle. */
  aide?: string;
  /** L'étape est-elle franchissable en l'état ? */
  pret: boolean;
  /** Libellé du bouton de validation, si « Suivant → » ne convient pas. */
  valider?: string;
  /** Ce qu'il faut appliquer au moment de valider. */
  onValider?: () => Promise<void> | void;
  rendu: () => React.ReactNode;
}

interface ActionsJour {
  onJour: (patch: PatchJour) => Promise<void> | void;
  onMort: (position: number, cause: string) => Promise<void> | void;
  onCapitaine: (position: number | null) => Promise<void> | void;
  onPublic: (position: number, valeur: boolean) => Promise<void> | void;
  onServante: (servante: number, morte: number) => Promise<void> | void;
  onEtat: (patch: HostState) => Promise<void> | void;
  onNuitSuivante: () => Promise<void> | void;
  onTerminer: () => Promise<void> | void;
}

const CAUSES: Record<string, string> = {
  loups: "dévoré par les Loups-Garous",
  poison: "empoisonné",
  chagrin: "mort de chagrin",
  "loup blanc": "égorgé par le Loup-Garou Blanc",
  gangrene: "emporté par la gangrène",
  vote: "éliminé par le village",
  chasseur: "abattu par le Chasseur",
};

export function ConduiteJour({
  game,
  onJour,
  onMort,
  onCapitaine,
  onPublic,
  onServante,
  onEtat,
  onNuitSuivante,
  onTerminer,
}: { game: GameDTO } & ActionsJour) {
  const etapes = useMemo(
    () =>
      construire(game, {
        onJour,
        onMort,
        onCapitaine,
        onPublic,
        onServante,
        onEtat,
        onNuitSuivante,
        onTerminer,
      }),
    [game, onJour, onMort, onCapitaine, onPublic, onServante, onEtat, onNuitSuivante, onTerminer],
  );

  const { conseils } = useConseils();
  const faites = game.jour?.faites ?? [];
  const restantes = etapes.filter((x) => !faites.includes(x.id));
  const etape = restantes[0];
  const rang = etapes.length - restantes.length;

  const valider = async () => {
    if (!etape) return;
    if (etape.onValider) await etape.onValider();
    await onJour({ faites: [...faites, etape.id] });
  };

  if (!etape) {
    return (
      <div className="surface p-5">
        <p className="text-sm text-muted-foreground">
          La journée est terminée. Lancez la nuit suivante depuis le bandeau ci-dessus.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="surface p-4">
        <p className="text-[11px] tracking-widest text-muted-foreground uppercase">
          Jour {game.night} · étape {rang + 1} sur {etapes.length}
        </p>
        <div className="mt-2 flex h-1 gap-1">
          {etapes.map((x, i) => (
            <span
              key={x.id}
              className={cn(
                "flex-1 rounded-full",
                i < rang ? "bg-primary/60" : i === rang ? "bg-primary" : "bg-border",
              )}
            />
          ))}
        </div>
      </div>

      <div className="surface p-5">
        <div className="flex items-center gap-3">
          {etape.role ? (
            <RoleSigil role={etape.role} />
          ) : (
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-secondary text-2xl"
              aria-hidden
            >
              {etape.emoji}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-black">{etape.titre}</h2>
            {etape.role && (
              <p className="truncate text-[11px] text-muted-foreground">
                {game.seats
                  .filter((s) => s.roleId === etape.role?.id)
                  .map((s) => `${s.name || `Place ${s.position}`}${s.alive ? "" : " †"}`)
                  .join(", ") || "—"}
              </p>
            )}
          </div>
        </div>

        {etape.annonce && (
          <p className="mt-4 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm font-semibold text-primary">
            {etape.annonce}
          </p>
        )}

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{etape.consigne}</p>

        {etape.aide && conseils && (
          <p className="mt-3 rounded-xl border border-border bg-secondary p-3 text-[11px] leading-relaxed text-muted-foreground">
            {etape.aide}
          </p>
        )}

        <div className="mt-4">{etape.rendu()}</div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="ghost"
          className="flex-1"
          disabled={rang === 0}
          onClick={() => void onJour({ faites: faites.slice(0, -1) })}
        >
          ← Précédent
        </Button>
        <Button className="flex-1" disabled={!etape.pret} onClick={() => void valider()}>
          {etape.valider ?? "Suivant →"}
        </Button>
      </div>

      {!etape.pret && (
        <p className="text-center text-[11px] text-destructive">
          Cette étape attend une décision avant de continuer.
        </p>
      )}

      {etape.role && <BoutonAide role={etape.role} />}

      <p className="text-center text-[11px] text-muted-foreground">
        Revenir en arrière rouvre l'étape précédente, mais ne ressuscite personne : une mort marquée
        par erreur s'annule depuis l'onglet 👥 Joueurs.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Briques d'affichage                                                 */
/* ------------------------------------------------------------------ */
/* Volontairement recopiées de la conduite de nuit plutôt que          */
/* partagées : les deux moteurs peuvent diverger, et un fichier de     */
/* moins à toucher est un fichier de moins à casser.                   */

function Profils({
  joueurs,
  choisis,
  sur,
  nom,
  roleDe,
}: {
  joueurs: SeatDTO[];
  choisis: number[];
  sur: (p: number) => void;
  nom: (p: number) => string;
  roleDe: (p: number) => Role | undefined;
}) {
  if (joueurs.length === 0) {
    return <p className="text-xs text-muted-foreground">Aucun joueur disponible.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {joueurs.map((s) => {
        const actif = choisis.includes(s.position);
        const r = roleDe(s.position);
        return (
          <button
            key={s.position}
            onClick={() => sur(s.position)}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition",
              actif ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary",
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold">{nom(s.position)}</span>
              <span className="block truncate text-[10px] text-muted-foreground">
                {r?.name ?? "—"}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function FicheJoueur({ nom, role }: { nom: string; role: Role | undefined }) {
  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 text-center">
      <p className="mt-1 text-sm text-muted-foreground">{nom}</p>
      <p className="font-display text-2xl font-black text-primary">
        {role?.name ?? "carte inconnue"}
      </p>
      {role && <CampBadge camp={role.camp} className="mt-2" />}
      {role && <p className="mt-3 text-xs text-muted-foreground">{role.short}</p>}
    </div>
  );
}

function GrosBouton({
  onClick,
  actif,
  danger,
  children,
}: {
  onClick: () => void;
  actif?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border px-3 py-4 text-sm font-semibold",
        actif
          ? danger
            ? "border-destructive bg-destructive/15 text-destructive"
            : "border-primary bg-primary/15 text-primary"
          : "border-border bg-secondary",
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Construction du fil                                                 */
/* ------------------------------------------------------------------ */

function construire(game: GameDTO, a: ActionsJour): EtapeJour[] {
  const jour = game.jour ?? {};
  const etat = game.hostState ?? {};
  const seats = game.seats;
  const vivants = seats.filter((s) => s.alive);

  const siege = (p: number) => seats.find((s) => s.position === p);
  const nom = (p: number) => siege(p)?.name || `Place ${p}`;
  const roleDe = (p: number) => {
    const id = siege(p)?.roleId;
    return id ? ROLES_BY_ID[id] : undefined;
  };
  const R = (id: string) => ROLES_BY_ID[id]!;
  const estLoup = (s: SeatDTO) => {
    const r = s.roleId ? ROLES_BY_ID[s.roleId] : undefined;
    return (
      r?.camp === "loups" ||
      r?.id === "loup-garou-blanc" ||
      (etat.devenusLoups ?? []).includes(s.position)
    );
  };

  /**
   * Choix en attente.
   *
   * On enregistre d'abord ce que le Maître du Jeu touche, on l'applique
   * seulement à la validation. Sans cela, une action appliquée sur-le-champ
   * ferait parfois disparaître sa propre étape du fil — l'écharpe du
   * Capitaine, par exemple, cesse d'être vacante dès qu'on la donne — et
   * le bouton « Suivant » validerait alors l'étape d'après.
   */
  const choix = jour.choix ?? {};
  const poser = (cle: string, valeur: number) => a.onJour({ choix: { ...choix, [cle]: valeur } });

  const servante = vivants.find((s) => s.roleId === "servante-devouee");
  const servanteDispo =
    servante !== undefined && !(etat.pouvoirsUtilises ?? []).includes("servante-devouee");

  const e: EtapeJour[] = [];

  /* ---------------- Déclencheurs attachés à une mort ---------------- */

  function declencheurs(position: number): EtapeJour[] {
    const s = siege(position);
    if (!s) return [];
    const r = roleDe(position);
    const prise = s.statuses.includes("carte-prise");
    const liste: EtapeJour[] = [];

    /* La carte du mort. La Servante peut s'en emparer avant qu'elle ne soit
       retournée : c'est le seul moment où elle a le droit de se dévoiler. */
    const offreServante = servanteDispo && servante && servante.position !== position;
    liste.push({
      id: `carte-${position}`,
      emoji: "🃏",
      titre: `La carte de ${nom(position)}`,
      consigne: offreServante
        ? "Laissez d'abord un instant à la Servante Dévouée pour se dévoiler. Si personne ne bouge, retournez la carte : elle s'affiche aussitôt sur tous les téléphones."
        : "Retournez sa carte : elle s'affiche aussitôt sur tous les téléphones. Le joueur éliminé ne parle plus.",
      pret: s.publicRole || prise,
      rendu: () => (
        <>
          <FicheJoueur nom={nom(position)} role={r} />
          {prise ? (
            <p className="mt-3 rounded-xl border border-border bg-secondary p-3 text-xs text-muted-foreground">
              🧹 La Servante Dévouée a pris cette carte sans la montrer. Personne ne saura jamais
              qui était {nom(position)}.
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              <GrosBouton onClick={() => void a.onPublic(position, true)} actif={s.publicRole}>
                {s.publicRole ? "🃏 Carte retournée" : "🃏 Retourner sa carte"}
              </GrosBouton>
              {offreServante && servante && (
                <GrosBouton onClick={() => void a.onServante(servante.position, position)}>
                  🧹 La Servante Dévouée prend cette carte
                </GrosBouton>
              )}
            </div>
          )}
        </>
      ),
    });

    /* Le Chasseur tire, même mort de chagrin. */
    if (r?.id === "chasseur") {
      const cle = `chasseur-${position}`;
      const vise = choix[cle];
      liste.push({
        id: cle,
        role: R("chasseur"),
        emoji: "🎯",
        titre: "La balle du Chasseur",
        annonce: "« Le Chasseur tire une dernière balle. »",
        consigne:
          "Touchez le joueur qu'il abat. C'est obligatoire et immédiat — et cela peut en entraîner d'autres.",
        aide: "Il tire dans tous les cas : dévoré, exécuté, empoisonné, ou mort de chagrin en suivant son Amoureux. Sa victime est éliminée sur-le-champ, avec toutes les conséquences que cela entraîne.",
        pret: vise !== undefined,
        onValider: async () => {
          if (vise && siege(vise)?.alive) await a.onMort(vise, "chasseur");
        },
        rendu: () => (
          <Profils
            joueurs={vivants}
            choisis={vise !== undefined ? [vise] : []}
            sur={(p) => void poser(cle, p)}
            nom={nom}
            roleDe={roleDe}
          />
        ),
      });
    }

    /* L'écharpe passe de main en main : le Capitaine choisit son successeur. */
    if (s.isCaptain && etat.avecCapitaine !== false) {
      const cle = `capitaine-${position}`;
      const suivant = choix[cle];
      liste.push({
        id: cle,
        role: R("capitaine"),
        emoji: "🎖️",
        titre: "L'écharpe du Capitaine",
        annonce: "« Le Capitaine désigne son successeur. »",
        consigne:
          "Avant de quitter la table, il choisit qui reprend l'écharpe. Touchez ce joueur : son vote comptera double à partir de maintenant.",
        aide: "Le successeur est désigné par le Capitaine mourant lui-même, pas par un nouveau vote du village.",
        pret: suivant !== undefined,
        onValider: async () => {
          if (suivant) await a.onCapitaine(suivant);
        },
        rendu: () => (
          <Profils
            joueurs={vivants}
            choisis={suivant !== undefined ? [suivant] : []}
            sur={(p) => void poser(cle, p)}
            nom={nom}
            roleDe={roleDe}
          />
        ),
      });
    }

    /* L'Ancien tombé sous un coup du village : tout le monde perd ses pouvoirs. */
    if (r?.id === "ancien" && etat.villageSansPouvoirs) {
      liste.push({
        id: `ancien-${position}`,
        role: R("ancien"),
        emoji: "🧓",
        titre: "Le village perd ses pouvoirs",
        annonce: "« Vous avez tué l'Ancien : le village est frappé de dépit. »",
        consigne:
          "Annoncez-le à voix haute. Voyante, Sorcière, Salvateur, Renard, Chasseur : plus aucun villageois n'a de pouvoir jusqu'à la fin de la partie. Inutile de continuer à les appeler la nuit. Les Loups-Garous et les rôles solitaires, eux, jouent normalement.",
        aide: "Seuls les coups du village comptent : le vote, le poison de la Sorcière et le tir du Chasseur. Dévoré par les Loups, l'Ancien n'emporte rien avec lui.",
        pret: true,
        rendu: () => (
          <p className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
            À dire au village, sans détour : les pouvoirs sont éteints.
          </p>
        ),
      });
    }

    /* Le Bouc Émissaire décide qui votera demain. */
    if (r?.id === "bouc-emissaire" && s.deathCause === "vote") {
      const prives = etat.privesDeVote ?? [];
      const demain = game.night + 1;
      liste.push({
        id: `bouc-${position}`,
        role: R("bouc-emissaire"),
        emoji: "🐐",
        titre: "La rancune du Bouc Émissaire",
        annonce: "« Le Bouc Émissaire désigne qui n'aura pas le droit de voter demain. »",
        consigne:
          "Touchez les joueurs qu'il prive de vote pour la journée de demain. S'il n'en prive aucun, validez avec le bouton du dessous.",
        aide: "Il peut en priver un, plusieurs, ou tout le village. La privation ne dure qu'une journée, et l'application vous la rappellera au moment du vote.",
        pret: etat.privesJour === demain,
        rendu: () => (
          <>
            <Profils
              joueurs={vivants}
              choisis={etat.privesJour === demain ? prives : []}
              sur={(p) => {
                const base = etat.privesJour === demain ? prives : [];
                void a.onEtat({
                  privesDeVote: base.includes(p) ? base.filter((x) => x !== p) : [...base, p],
                  privesJour: demain,
                });
              }}
              nom={nom}
              roleDe={roleDe}
            />
            <div className="mt-2">
              <GrosBouton
                onClick={() => void a.onEtat({ privesDeVote: [], privesJour: demain })}
                actif={etat.privesJour === demain && prives.length === 0}
              >
                Il ne prive personne de vote
              </GrosBouton>
            </div>
          </>
        ),
      });
    }

    /* L'Ange éliminé au tout premier vote gagne seul. */
    if (r?.id === "ange" && s.deathCause === "vote" && game.night <= 1) {
      liste.push({
        id: `ange-${position}`,
        role: R("ange"),
        emoji: "😇",
        titre: "L'Ange l'emporte",
        annonce: "« L'Ange a été éliminé au premier vote : il gagne, seul. »",
        consigne: "Retournez sa carte : la partie s'arrête là, personne d'autre ne gagne.",
        aide: "S'il avait survécu à ce premier tour, il serait redevenu un Simple Villageois pour le reste de la partie.",
        pret: true,
        onValider: () => a.onEtat({ angeGagne: true }),
        rendu: () => <FicheJoueur nom={nom(position)} role={r} />,
      });
    }

    /* Le Chevalier contamine le premier Loup à sa gauche. */
    if (r?.id === "chevalier-epee-rouillee" && s.deathCause === "loups") {
      const cle = `chevalier-${position}`;
      const vise = choix[cle];
      const loups = vivants.filter(estLoup);
      // « À sa gauche » : le prochain Loup en tournant dans le sens des
      // places. L'ordre des places ne suit la table que si vous l'avez
      // rangé, d'où la possibilité d'en désigner un autre à la main.
      const ordre = [...vivants].sort((x, y) => x.position - y.position);
      const gauche = [
        ...ordre.filter((x) => x.position > s.position),
        ...ordre.filter((x) => x.position < s.position),
      ].find(estLoup);
      liste.push({
        id: cle,
        role: R("chevalier-epee-rouillee"),
        emoji: "⚔️",
        titre: "L'épée rouillée",
        consigne:
          "Le premier Loup-Garou assis à sa gauche attrape la gangrène : il mourra pendant la nuit qui vient, et vous l'annoncerez demain matin. Touchez-le pour le marquer.",
        aide: "Le village pourra en déduire que tous les habitants situés entre le Chevalier et le Loup malade sont d'innocents villageois. Ne dites rien de plus que la mort elle-même.",
        pret: vise !== undefined,
        onValider: async () => {
          if (vise) await a.onEtat({ gangrene: vise });
        },
        rendu: () => (
          <>
            <Profils
              joueurs={loups}
              choisis={vise !== undefined ? [vise] : []}
              sur={(p) => void poser(cle, p)}
              nom={nom}
              roleDe={roleDe}
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              {gauche
                ? `D'après l'ordre des places, ce serait ${nom(gauche.position)}. Vérifiez qui est physiquement assis à sa gauche.`
                : "Aucun Loup-Garou vivant : l'épée ne contamine personne."}
            </p>
          </>
        ),
      });
    }

    return liste;
  }

  /** Les morts survenues depuis le lever du jour, dans l'ordre où elles sont tombées. */
  const mortsDuJour = () =>
    seats
      .filter((s) => !s.alive && s.deathOrder > (jour.ordreDepart ?? 0))
      .sort((x, y) => x.deathOrder - y.deathOrder)
      .flatMap((s) => declencheurs(s.position));

  /* ---------------- Le matin ---------------- */

  const mortsNuit = jour.mortsNuit ?? [];
  const sauves = jour.sauves ?? [];

  e.push({
    id: "lever",
    emoji: "☀️",
    titre: `Lever du jour ${game.night}`,
    annonce: "« Le village se réveille. »",
    consigne:
      "Annoncez les morts, jamais la cause : le village doit la deviner. Les éliminés retournent leur carte et ne parlent plus de la partie.",
    pret: true,
    rendu: () => (
      <>
        {mortsNuit.length === 0 ? (
          <p className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-center text-sm font-semibold text-primary">
            « Cette nuit, personne n'est mort. »
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {mortsNuit.map((m) => (
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

        {(sauves.length > 0 || jour.infecte !== undefined || jour.enfantTransforme) && (
          <>
            <p className="mt-5 text-[11px] tracking-widest text-destructive uppercase">
              Pour vous seul — ne dites rien
            </p>
            <ul className="mt-1 flex flex-col gap-1 text-xs text-muted-foreground">
              {sauves.map((s) => (
                <li key={s.position}>
                  • {nom(s.position)} a survécu : {s.raison}.
                </li>
              ))}
              {jour.infecte !== undefined && (
                <li>
                  • Prévenez discrètement {nom(jour.infecte)} qu'il rejoint les Loups-Garous, en
                  gardant son pouvoir.
                </li>
              )}
              {jour.enfantTransforme && (
                <li>
                  • Le modèle de l'Enfant Sauvage est mort : prévenez-le qu'il devient Loup-Garou.
                </li>
              )}
            </ul>
          </>
        )}
      </>
    ),
  });

  for (const m of mortsNuit) e.push(...declencheurs(m.position));

  // La balle d'un Chasseur dévoré cette nuit part au lever du jour, et sa
  // victime a droit à sa carte retournée et à ses propres déclenchements
  // avant que le village ne débatte. Les identifiants étant stables, les
  // étapes déjà franchies ne reviennent pas.
  e.push(...mortsDuJour());

  /* Le Joueur de Flûte : les envoûtés sont prévenus chaque matin. */
  const charmed = (etat.charmed ?? []).filter((p) => siege(p)?.alive);
  if (charmed.length > 0) {
    e.push({
      id: "envoutes",
      role: R("joueur-de-flute"),
      emoji: "🎶",
      titre: "Les envoûtés",
      consigne:
        "Faites signe à ces joueurs qu'ils sont sous le charme. Ils se reconnaissent entre eux, mais ne savent pas qui joue de la flûte.",
      aide: "Le Joueur de Flûte gagne seul, et immédiatement, dès que tous les survivants sont envoûtés. Comptez-les à chaque matin.",
      pret: true,
      rendu: () => (
        <p className="rounded-xl border border-border bg-secondary p-3 text-xs">
          {charmed.map((p) => nom(p)).join(", ")} — soit {charmed.length} envoûté
          {charmed.length > 1 ? "s" : ""} sur {vivants.length} survivants.
        </p>
      ),
    });
  }

  /* Le Montreur d'Ours grogne au lever du jour. */
  const montreur = vivants.find((s) => s.roleId === "montreur-ours");
  if (montreur && vivants.length >= 3) {
    const i = vivants.findIndex((s) => s.position === montreur.position);
    const gauche = vivants[(i - 1 + vivants.length) % vivants.length];
    const droite = vivants[(i + 1) % vivants.length];
    const infecte = (etat.devenusLoups ?? []).includes(montreur.position);
    const grogne =
      infecte ||
      (gauche !== undefined && estLoup(gauche)) ||
      (droite !== undefined && estLoup(droite));
    e.push({
      id: "ours",
      role: R("montreur-ours"),
      emoji: "🐻",
      titre: "Le grognement de l'ours",
      consigne: game.singleDevice
        ? "Annoncez le grognement à voix haute, avant le débat, sans dire de quel côté il vient."
        : "Regardez qui est physiquement assis de chaque côté du Montreur d'Ours. Si l'un des deux est passé du côté des Loups, faites grogner l'ours.",
      aide: "Seuls les voisins encore en jeu comptent : on saute les éliminés. Les joueurs passés côté meute en cours de partie — infection, Enfant Sauvage, Chien-Loup — comptent comme des Loups.",
      pret: true,
      rendu: () =>
        game.singleDevice ? (
          <>
            <p
              className={cn(
                "rounded-xl border p-4 text-center font-display text-base font-black",
                grogne
                  ? "border-destructive/60 bg-destructive/15 text-destructive"
                  : "border-border bg-secondary text-muted-foreground",
              )}
            >
              {grogne ? "FAITES GROGNER L'OURS" : "L'ours reste silencieux"}
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {nom(montreur.position)} · voisins vivants : {gauche ? nom(gauche.position) : "—"} et{" "}
              {droite ? nom(droite.position) : "—"}
              {infecte
                ? " · le Montreur est lui-même infecté : l'ours grognera à chaque tour."
                : ""}
            </p>
          </>
        ) : (
          <p className="rounded-xl border border-border bg-secondary p-3 text-xs">
            Côté Loups en ce moment :{" "}
            {vivants
              .filter(estLoup)
              .map((s) => nom(s.position))
              .join(", ") || "personne"}
            . L'ordre des places ne suit votre table que si vous l'avez rangé, donc c'est à vous de
            regarder les vrais voisins.
          </p>
        ),
    });
  }

  /* ---------------- L'élection du Capitaine ---------------- */

  if (
    etat.avecCapitaine !== false &&
    !vivants.some((s) => s.isCaptain) &&
    !etat.chargePerdue &&
    vivants.length > 1
  ) {
    const elu = choix["capitaine-election"];
    e.push({
      id: "capitaine-election",
      role: R("capitaine"),
      emoji: "🎖️",
      titre: "Élection du Capitaine",
      annonce: "« Le village élit son Capitaine. »",
      consigne:
        "Faites voter le village à main levée, puis touchez l'élu. Sa voix comptera double pour le reste de la partie.",
      aide: "Le Capitaine tranche les égalités et, à sa mort, désigne lui-même son successeur. Ce n'est pas une carte : n'importe qui peut l'être, y compris un Loup-Garou.",
      pret: elu !== undefined,
      onValider: async () => {
        if (elu) await a.onCapitaine(elu);
      },
      rendu: () => (
        <Profils
          joueurs={vivants}
          choisis={elu !== undefined ? [elu] : []}
          sur={(p) => void poser("capitaine-election", p)}
          nom={nom}
          roleDe={roleDe}
        />
      ),
    });
  }

  /* ---------------- Le débat et le vote ---------------- */

  const juge = vivants.find((s) => s.roleId === "juge-begue");
  const jugeDispo = juge !== undefined && !(etat.pouvoirsUtilises ?? []).includes("juge-begue");
  const tours = jour.secondTour ? 2 : 1;

  const majVotes = (t: number, valeur: TourDeVote) => {
    const copie = [...(jour.votes ?? [])];
    copie[t - 1] = valeur;
    return copie;
  };

  for (let t = 1; t <= tours; t++) {
    const v = (jour.votes ?? [])[t - 1] ?? undefined;
    // Un camp a déjà gagné : on ne rouvre pas un débat. Les tours entamés,
    // eux, restent dans le fil — leurs morts ont encore une carte à
    // retourner et des pouvoirs à déclencher.
    if (game.vainqueur && v === undefined) break;
    const baillonnes = vivants.filter((s) => s.statuses.includes("baillonne"));
    const sansVote = vivants.filter((s) => s.statuses.includes("sans-vote"));
    const prives = etat.privesJour === game.night ? (etat.privesDeVote ?? []) : [];

    e.push({
      id: `debat-${t}`,
      emoji: "💬",
      titre: t === 1 ? "Débat du village" : "Second débat",
      annonce: t === 1 ? "« Le débat est ouvert. »" : "« Le Juge Bègue exige un second vote. »",
      consigne:
        "Laissez le village discuter, puis passez au vote. Voici ce qu'il ne faut pas oublier avant de compter les voix.",
      pret: true,
      rendu: () => (
        <ul className="flex flex-col gap-2 text-xs">
          {baillonnes.length > 0 && (
            <li className="rounded-xl border border-border bg-secondary p-3">
              🤐 {baillonnes.map((s) => nom(s.position)).join(", ")} ne peut pas prononcer un mot
              aujourd'hui, mais vote et peut faire des gestes.
            </li>
          )}
          {sansVote.length > 0 && (
            <li className="rounded-xl border border-border bg-secondary p-3">
              🤡 {sansVote.map((s) => nom(s.position)).join(", ")} a été gracié : il parle, mais ne
              vote plus jamais.
            </li>
          )}
          {prives.length > 0 && (
            <li className="rounded-xl border border-border bg-secondary p-3">
              🐐 {prives.map((p) => nom(p)).join(", ")} : privé de vote aujourd'hui par le Bouc
              Émissaire.
            </li>
          )}
          {etat.avecCapitaine !== false && (
            <li className="rounded-xl border border-border bg-secondary p-3">
              🎖️{" "}
              {vivants.find((s) => s.isCaptain)
                ? `${nom(vivants.find((s) => s.isCaptain)!.position)} porte l'écharpe : sa voix compte double.`
                : "Pas de Capitaine en jeu : en cas d'égalité, personne ne tranche."}
            </li>
          )}
        </ul>
      ),
    });

    e.push({
      id: `vote-${t}`,
      emoji: "🗳️",
      titre: t === 1 ? "Vote du village" : "Second vote",
      annonce: "« Le village désigne celui qu'il envoie au bûcher. »",
      consigne:
        "Touchez le joueur qui recueille le plus de voix. S'il y a égalité, utilisez le bouton du dessous : les règles ne tranchent pas de la même manière selon qui est encore en vie.",
      pret: v !== undefined,
      onValider: async () => {
        if (v && v.designe > 0 && siege(v.designe)?.alive) await a.onMort(v.designe, "vote");
      },
      rendu: () => (
        <>
          <Profils
            joueurs={vivants}
            choisis={v && v.designe > 0 ? [v.designe] : []}
            sur={(p) => void a.onJour({ votes: majVotes(t, { designe: p }) })}
            nom={nom}
            roleDe={roleDe}
          />
          <div className="mt-2">
            <GrosBouton
              onClick={() => void a.onJour({ votes: majVotes(t, { designe: 0 }) })}
              actif={v?.designe === 0}
            >
              ⚖️ Le village est à égalité
            </GrosBouton>
          </div>
        </>
      ),
    });

    if (v && v.designe === 0) {
      const bouc = vivants.find((s) => s.roleId === "bouc-emissaire");
      const capitaine = etat.avecCapitaine === false ? undefined : vivants.find((s) => s.isCaptain);
      const tranche = v.tranche;
      e.push({
        id: `egalite-${t}`,
        emoji: "⚖️",
        titre: "Égalité des voix",
        consigne: bouc
          ? "Le Bouc Émissaire paie pour tout le monde : c'est lui qui est éliminé à la place du village."
          : capitaine
            ? "La voix du Capitaine tranche : touchez celui qu'il désigne."
            : "Sans Bouc Émissaire ni Capitaine, le village se sépare sans faire de victime.",
        aide: "L'ordre est toujours le même : le Bouc Émissaire d'abord, la voix du Capitaine ensuite, et à défaut personne n'est éliminé ce tour-ci.",
        pret: tranche !== undefined,
        onValider: async () => {
          if (tranche && tranche > 0 && siege(tranche)?.alive) await a.onMort(tranche, "vote");
        },
        rendu: () =>
          bouc ? (
            <>
              <FicheJoueur nom={nom(bouc.position)} role={roleDe(bouc.position)} />
              <div className="mt-3">
                <GrosBouton
                  onClick={() =>
                    void a.onJour({ votes: majVotes(t, { designe: 0, tranche: bouc.position }) })
                  }
                  actif={tranche === bouc.position}
                  danger
                >
                  🐐 Le Bouc Émissaire est éliminé
                </GrosBouton>
              </div>
            </>
          ) : capitaine ? (
            <Profils
              joueurs={vivants}
              choisis={tranche !== undefined && tranche > 0 ? [tranche] : []}
              sur={(p) => void a.onJour({ votes: majVotes(t, { designe: 0, tranche: p }) })}
              nom={nom}
              roleDe={roleDe}
            />
          ) : (
            <GrosBouton
              onClick={() => void a.onJour({ votes: majVotes(t, { designe: 0, tranche: 0 }) })}
              actif={tranche === 0}
            >
              Personne n'est éliminé aujourd'hui
            </GrosBouton>
          ),
      });
    }

    /* L'Idiot gracié : le vote l'a désigné, mais il reste en jeu. */
    const vise = v ? (v.designe > 0 ? v.designe : (v.tranche ?? 0)) : 0;
    const viseSiege = vise > 0 ? siege(vise) : undefined;
    if (
      viseSiege &&
      viseSiege.alive &&
      viseSiege.roleId === "idiot-du-village" &&
      viseSiege.statuses.includes("sans-vote")
    ) {
      e.push({
        id: `idiot-${t}`,
        role: R("idiot-du-village"),
        emoji: "🤡",
        titre: "L'Idiot est gracié",
        annonce: "« Le village a voté contre l'Idiot du Village : il est gracié. »",
        consigne:
          "Sa carte est déjà retournée sur tous les téléphones. Il reste en jeu, mais ne votera plus jamais — et il n'y a pas de nouveau vote aujourd'hui.",
        aide: "Il n'est protégé que du vote, et une seule fois : les Loups le dévorent normalement, le Chasseur l'abat, et un second vote contre lui l'élimine pour de bon.",
        pret: !viseSiege.isCaptain || etat.chargePerdue === true,
        rendu: () =>
          viseSiege.isCaptain ? (
            <>
              <p className="mb-2 text-xs text-muted-foreground">
                Il portait l'écharpe : gracié, il ne la transmet pas. La charge de Capitaine est
                définitivement perdue.
              </p>
              <GrosBouton
                onClick={() =>
                  void (async () => {
                    await a.onCapitaine(null);
                    await a.onEtat({ chargePerdue: true });
                  })()
                }
                actif={etat.chargePerdue === true}
              >
                🎖️ L'écharpe disparaît de la partie
              </GrosBouton>
            </>
          ) : (
            <FicheJoueur nom={nom(viseSiege.position)} role={roleDe(viseSiege.position)} />
          ),
      });
    }

    e.push(...mortsDuJour());

    if (t === 1 && jugeDispo && juge) {
      e.push({
        id: "juge-begue",
        role: R("juge-begue"),
        emoji: "⚖️",
        titre: "Le Juge Bègue",
        consigne:
          "S'il vous a fait le signe convenu, un second vote a lieu immédiatement. Sinon, la journée s'achève ici.",
        aide: "Une seule fois dans la partie. Le second vote se déroule comme le premier, sur tous les joueurs encore en vie.",
        pret: jour.secondTour !== undefined,
        onValider: async () => {
          if (jour.secondTour) {
            await a.onEtat({
              pouvoirsUtilises: [...(etat.pouvoirsUtilises ?? []), "juge-begue"],
            });
          }
        },
        rendu: () => (
          <div className="flex flex-col gap-2">
            <GrosBouton
              onClick={() => void a.onJour({ secondTour: true })}
              actif={jour.secondTour === true}
            >
              ⚖️ Il a fait le signe : second vote
            </GrosBouton>
            <GrosBouton
              onClick={() => void a.onJour({ secondTour: false })}
              actif={jour.secondTour === false}
            >
              Rien ne se passe, la journée s'achève
            </GrosBouton>
          </div>
        ),
      });
    }
  }

  /* ---------------- La nuit tombe ---------------- */

  // Les morts du dernier tour ont toujours leur carte et leurs pouvoirs à
  // traiter avant qu'on annonce quoi que ce soit : c'est la balle du
  // Chasseur qui peut encore renverser la partie.
  e.push(...mortsDuJour());

  if (game.vainqueur) {
    e.push({
      id: "fin",
      emoji: "🏆",
      titre: "Partie terminée",
      annonce: game.vainqueur.texte,
      consigne:
        "Annoncez-le à voix haute : toutes les cartes viennent de se retourner sur les téléphones. La partie suivante s'ouvrira avec les mêmes joueurs.",
      pret: true,
      valider: "Terminer la partie",
      onValider: a.onTerminer,
      rendu: () => (
        <ul className="flex flex-col gap-2">
          {[...seats]
            .sort((x, y) => x.position - y.position)
            .map((s) => {
              const r = roleDe(s.position);
              return (
                <li
                  key={s.position}
                  className="flex items-center gap-3 rounded-xl border border-border bg-secondary p-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">
                      {nom(s.position)}
                      <span className="text-muted-foreground"> — </span>
                      <span className="text-primary">{r?.name ?? "carte inconnue"}</span>
                    </span>
                    <span className="block text-[10px] text-muted-foreground">
                      {s.alive ? "survivant" : "éliminé"}
                    </span>
                  </span>
                </li>
              );
            })}
        </ul>
      ),
    });
  } else {
    e.push({
      id: "cloture",
      emoji: "🌙",
      titre: `Fin du jour ${game.night}`,
      annonce: "« La nuit tombe sur le village. »",
      consigne:
        "Vérifiez qu'il reste des survivants dans les deux camps avant de lancer la nuit suivante. Le bâillon du Magicien tombe à cet instant.",
      pret: true,
      valider: `🌙 Nuit ${game.night + 1}`,
      onValider: a.onNuitSuivante,
      rendu: () => (
        <p className="rounded-xl border border-border bg-secondary p-3 text-center text-xs">
          {vivants.length} survivant{vivants.length > 1 ? "s" : ""} sur {seats.length} joueurs.
        </p>
      ),
    });
  }

  /* Une même étape peut être proposée par deux tours de vote : on ne la
     garde qu'une fois, à sa première place dans le fil. */
  const vus = new Set<string>();
  return e.filter((x) => {
    if (vus.has(x.id)) return false;
    vus.add(x.id);
    return true;
  });
}
