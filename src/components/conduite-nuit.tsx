import { useMemo, useState } from "react";
import { Button } from "@/components/ui-kit";
import { PREMIERE_NUIT_SEULEMENT, ROLES_BY_ID, type Role } from "@/data/roles";
import { CLOTURE, ETAPES, OUVERTURE, type EtapeNuit } from "@/data/nuit";
import type { GameDTO, HostState, NuitEnCours, SeatDTO } from "@/lib/party.functions";
import { cn } from "@/lib/utils";

/**
 * Conduite de la nuit, étape par étape.
 *
 * L'ordre suit le livret des Loups-Garous de Thiercelieux, mais ne retient
 * que les rôles réellement présents dans la partie : sans Cupidon, ni
 * Cupidon ni les Amoureux ne sont mentionnés. Les rôles dont le porteur est
 * mort disparaissent aussi.
 *
 * Rien n'est appliqué au fil de l'eau. Chaque action est notée, et tout se
 * résout au lever du jour : c'est la seule façon de gérer correctement une
 * victime des Loups que la Sorcière soigne ensuite.
 */
export function ConduiteNuit({
  game,
  onAction,
  onResoudre,
  onVol,
  onBaillon,
  onRevelation,
}: {
  game: GameDTO;
  onAction: (patch: NuitEnCours) => void;
  onResoudre: () => void;
  onVol: (position: number, avec: number) => void;
  onBaillon: (position: number) => void;
  onRevelation: (de: number, vers: number) => void;
}) {
  const nuit = game.nuit ?? {};
  const etat = game.hostState ?? {};
  const [index, setIndex] = useState(0);

  const etapes = useMemo(() => construireEtapes(game), [game]);
  const courante = etapes[Math.min(index, etapes.length - 1)];
  const dernier = index >= etapes.length - 1;

  const vivants = game.seats.filter((s) => s.alive);
  const nom = (p: number) => game.seats.find((s) => s.position === p)?.name || `Place ${p}`;

  if (etapes.length === 0) {
    return (
      <div className="surface p-4">
        <p className="text-sm text-muted-foreground">
          Aucun rôle à appeler cette nuit. Passez directement au lever du jour.
        </p>
        <Button className="mt-3 w-full" onClick={onResoudre}>
          ☀️ Lever du jour
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="surface p-4">
        <p className="text-[11px] tracking-widest text-muted-foreground uppercase">
          Nuit {game.night} · étape {index + 1} sur {etapes.length}
        </p>
        <div className="mt-2 flex h-1 gap-1">
          {etapes.map((_, i) => (
            <span
              key={i}
              className={cn(
                "flex-1 rounded-full",
                i < index ? "bg-primary/60" : i === index ? "bg-primary" : "bg-border",
              )}
            />
          ))}
        </div>
      </div>

      {index === 0 && (
        <p className="rounded-xl border border-border bg-secondary p-3 text-center text-sm italic">
          {OUVERTURE}
        </p>
      )}

      <div className="surface p-5">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{courante!.role.emoji}</span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-black">{courante!.role.name}</h2>
            <p className="truncate text-[11px] text-muted-foreground">
              {game.seats
                .filter((s) => s.roleId === courante!.role.id)
                .map((s) => `${s.name || `Place ${s.position}`}${s.alive ? "" : " †"}`)
                .join(", ") || "—"}
            </p>
          </div>
        </div>

        <p className="mt-4 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm font-semibold text-primary">
          {courante!.etape.appel}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {courante!.etape.consigne}
        </p>

        <ActionEtape
          etape={courante!.etape}
          role={courante!.role}
          game={game}
          nuit={nuit}
          etat={etat}
          vivants={vivants}
          nom={nom}
          onAction={onAction}
          onVol={onVol}
          onBaillon={onBaillon}
          onRevelation={onRevelation}
        />
      </div>

      <div className="flex gap-2">
        <Button
          variant="ghost"
          className="flex-1"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          ← Précédent
        </Button>
        {dernier ? (
          <Button className="flex-1" onClick={onResoudre}>
            ☀️ Lever du jour
          </Button>
        ) : (
          <Button className="flex-1" onClick={() => setIndex((i) => i + 1)}>
            Suivant →
          </Button>
        )}
      </div>

      {dernier && (
        <p className="rounded-xl border border-border bg-secondary p-3 text-center text-sm italic">
          {CLOTURE}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

interface EtapeCalculee {
  role: Role;
  etape: EtapeNuit;
}

/** Ne garde que les rôles présents, vivants, et pertinents pour cette nuit. */
function construireEtapes(game: GameDTO): EtapeCalculee[] {
  const enJeu = new Set(
    game.seats
      .filter((s) => s.alive)
      .map((s) => s.roleId)
      .filter(Boolean) as string[],
  );

  // Les Amoureux n'existent que si Cupidon est en jeu et a désigné un couple.
  if (enJeu.has("cupidon") || game.seats.some((s) => s.loverGroup)) enJeu.add("amoureux");

  return [...enJeu]
    .map((id) => ROLES_BY_ID[id])
    .filter((r): r is Role => !!r && r.wakeOrder !== undefined && !!ETAPES[r.id])
    .filter((r) => {
      // Rôles de la seule première nuit.
      if (PREMIERE_NUIT_SEULEMENT.has(r.id)) {
        if (r.id === "voleur" && game.thiefVariant === "echange") return true;
        return game.night <= 1;
      }
      // Grand Méchant Loup : muet dès qu'un Loup est mort.
      if (r.id === "grand-mechant-loup") {
        return !game.seats.some(
          (s) => !s.alive && s.roleId && ROLES_BY_ID[s.roleId]?.camp === "loups",
        );
      }
      // Loup-Garou Blanc : une nuit sur deux.
      if (r.id === "loup-garou-blanc") return game.night % 2 === 0;
      return true;
    })
    .sort((a, b) => (a.wakeOrder ?? 0) - (b.wakeOrder ?? 0))
    .map((role) => ({ role, etape: ETAPES[role.id]! }));
}

/* ------------------------------------------------------------------ */

function ActionEtape({
  etape,
  role,
  game,
  nuit,
  etat,
  vivants,
  nom,
  onAction,
  onVol,
  onBaillon,
  onRevelation,
}: {
  etape: EtapeNuit;
  role: Role;
  game: GameDTO;
  nuit: NuitEnCours;
  etat: HostState;
  vivants: SeatDTO[];
  nom: (p: number) => string;
  onAction: (patch: NuitEnCours) => void;
  onVol: (position: number, avec: number) => void;
  onBaillon: (position: number) => void;
  onRevelation: (de: number, vers: number) => void;
}) {
  const porteur = game.seats.find((s) => s.roleId === role.id && s.alive);
  const valeurCle = (cle?: string) =>
    cle ? ((nuit as Record<string, unknown>)[cle] as number | undefined) : undefined;

  if (etape.action === "aucune") return null;

  if (etape.action === "cible") {
    const actuel = valeurCle(etape.cle);
    // Le Salvateur ne peut pas reprendre sa cible de la nuit précédente.
    const interdit = (p: number) => role.id === "salvateur" && etat.protectionPrecedente === p;
    return (
      <ChoixJoueur
        titre="Qui désigne-t-il ?"
        joueurs={vivants}
        actuel={actuel}
        interdit={interdit}
        noteInterdit="protégé la nuit dernière"
        nom={nom}
        onChoisir={(p) => onAction({ [etape.cle!]: actuel === p ? null : p } as NuitEnCours)}
      />
    );
  }

  if (etape.action === "loups") {
    const infectPossible =
      game.seats.some((s) => s.roleId === "infect-pere-des-loups" && s.alive) &&
      !etat.infectionUtilisee;
    return (
      <>
        <ChoixJoueur
          titre="Victime désignée par la meute"
          joueurs={vivants}
          actuel={nuit.victimeLoups}
          nom={nom}
          onChoisir={(p) =>
            onAction({ victimeLoups: nuit.victimeLoups === p ? null : p } as NuitEnCours)
          }
        />
        {infectPossible && nuit.victimeLoups !== undefined && (
          <button
            onClick={() => onAction({ infection: !nuit.infection } as NuitEnCours)}
            className={cn(
              "mt-3 w-full rounded-xl border px-3 py-3 text-xs font-semibold",
              nuit.infection
                ? "border-destructive bg-destructive/15 text-destructive"
                : "border-border bg-secondary text-muted-foreground",
            )}
          >
            🩸 {nuit.infection ? "Infection en cours" : "Infecter au lieu de dévorer"} — usage
            unique
          </button>
        )}
      </>
    );
  }

  if (etape.action === "sorciere") {
    return (
      <div className="mt-4 flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-secondary p-3">
          <p className="text-[11px] text-muted-foreground">Victime des Loups-Garous</p>
          <p className="font-display text-base font-bold">
            {nuit.victimeLoups !== undefined ? nom(nuit.victimeLoups) : "aucune pour l'instant"}
          </p>
        </div>

        {etat.potionVie === false ? (
          <p className="text-[11px] text-muted-foreground line-through">
            🧪 Potion de vie déjà utilisée
          </p>
        ) : (
          <button
            disabled={nuit.victimeLoups === undefined}
            onClick={() =>
              onAction({
                soin: nuit.soin !== undefined ? null : nuit.victimeLoups,
              } as NuitEnCours)
            }
            className={cn(
              "rounded-xl border px-3 py-3 text-sm font-semibold disabled:opacity-40",
              nuit.soin !== undefined
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-secondary",
            )}
          >
            🧪 {nuit.soin !== undefined ? "Victime sauvée" : "Utiliser la potion de vie"}
          </button>
        )}

        {etat.potionMort === false ? (
          <p className="text-[11px] text-muted-foreground line-through">
            ☠️ Potion de mort déjà utilisée
          </p>
        ) : (
          <ChoixJoueur
            titre="☠️ Empoisonner un joueur (facultatif)"
            joueurs={vivants}
            actuel={nuit.poison}
            nom={nom}
            onChoisir={(p) => onAction({ poison: nuit.poison === p ? null : p } as NuitEnCours)}
          />
        )}
        <p className="text-[11px] text-muted-foreground">
          La protection du Salvateur n'arrête pas le poison.
        </p>
      </div>
    );
  }

  if (etape.action === "revelation") {
    return (
      <div className="mt-4">
        <p className="text-xs text-muted-foreground">
          Carte de quel joueur montrer à {porteur ? nom(porteur.position) : "ce joueur"} ?
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {vivants
            .filter((s) => s.position !== porteur?.position)
            .map((s) => (
              <button
                key={s.position}
                onClick={() => porteur && onRevelation(porteur.position, s.position)}
                className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs"
              >
                {nom(s.position)}
              </button>
            ))}
        </div>
      </div>
    );
  }

  if (etape.action === "voleur") {
    return (
      <div className="mt-4">
        <p className="text-xs text-muted-foreground">
          Avec qui {porteur ? nom(porteur.position) : "le Voleur"} échange-t-il sa carte ?
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {vivants
            .filter((s) => s.position !== porteur?.position)
            .map((s) => (
              <button
                key={s.position}
                onClick={() => porteur && onVol(porteur.position, s.position)}
                className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs"
              >
                {nom(s.position)}
              </button>
            ))}
        </div>
      </div>
    );
  }

  if (etape.action === "couple") {
    const couple = game.seats.filter((s) => s.loverGroup).map((s) => s.position);
    return (
      <div className="mt-4">
        <p className="text-xs text-muted-foreground">
          Amoureux actuels : {couple.length ? couple.map(nom).join(" & ") : "aucun"}
        </p>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Le couple se désigne depuis l'onglet Village, avec le bouton ❤️ sur deux joueurs.
        </p>
      </div>
    );
  }

  if (etape.action === "flute") {
    const charmes = game.hostState.charmed ?? [];
    return (
      <div className="mt-4">
        <p className="text-xs text-muted-foreground">
          Envoûtés ({charmes.length} sur {vivants.length} vivants)
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Le suivi se fait dans le panneau « Suivi des pouvoirs », plus bas.
        </p>
      </div>
    );
  }

  if (etape.action === "baillon") {
    return (
      <ChoixJoueur
        titre="Qui est bâillonné pour demain ?"
        joueurs={vivants}
        actuel={game.seats.find((s) => s.statuses.includes("baillonne"))?.position}
        interdit={(p) => game.gagHistory.some((h) => h.position === p && game.night - h.night < 3)}
        noteInterdit="bâillonné il y a moins de trois nuits"
        nom={nom}
        onChoisir={onBaillon}
      />
    );
  }

  return null;
}

function ChoixJoueur({
  titre,
  joueurs,
  actuel,
  interdit,
  noteInterdit,
  nom,
  onChoisir,
}: {
  titre: string;
  joueurs: SeatDTO[];
  actuel?: number | undefined;
  interdit?: (p: number) => boolean;
  noteInterdit?: string;
  nom: (p: number) => string;
  onChoisir: (p: number) => void;
}) {
  return (
    <div className="mt-4">
      <p className="text-xs text-muted-foreground">{titre}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {joueurs.map((s) => {
          const bloque = interdit?.(s.position) ?? false;
          return (
            <button
              key={s.position}
              disabled={bloque}
              title={bloque ? noteInterdit : undefined}
              onClick={() => onChoisir(s.position)}
              className={cn(
                "rounded-xl border px-3 py-2 text-xs",
                actuel === s.position
                  ? "border-primary bg-primary/15 font-semibold text-primary"
                  : "border-border bg-secondary",
                bloque && "opacity-35",
              )}
            >
              {nom(s.position)}
            </button>
          );
        })}
      </div>
      {actuel !== undefined && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Touchez de nouveau {nom(actuel)} pour annuler ce choix.
        </p>
      )}
    </div>
  );
}
