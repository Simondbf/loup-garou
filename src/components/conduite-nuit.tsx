import { useMemo, useState } from "react";
import { Button, CampBadge, Modal, RoleSigil } from "@/components/ui-kit";
import { ROLES_BY_ID, type Role } from "@/data/roles";
import { CLOTURE, OUVERTURE } from "@/data/nuit";
import { useConseils } from "@/lib/conseils";
import type { GameDTO, PatchNuit, SeatDTO } from "@/lib/party.functions";
import { cn } from "@/lib/utils";

/**
 * Conduite de la nuit, un écran par étape.
 *
 * Chaque écran ne montre qu'une chose : le rôle appelé, la phrase à lire,
 * un aide-mémoire pour un Maître du Jeu qui découvre le rôle, et l'unique
 * action attendue. Tant que cette action n'est pas faite, « Suivant » reste
 * inactif : impossible d'oublier une désignation. Le retour en arrière est
 * toujours possible.
 *
 * Certains rôles occupent deux écrans : Cupidon désigne puis les Amoureux se
 * reconnaissent, la Voyante désigne puis la carte s'ouvre, le Renard flaire
 * puis la réponse tombe, la Sorcière soigne puis empoisonne.
 *
 * Seuls les rôles réellement en jeu et vivants sont appelés : en fin de
 * partie, la nuit se déroule donc très vite.
 */

interface Etape {
  id: string;
  role: Role;
  appel: string;
  consigne: string;
  aide: string;
  pret: () => boolean;
  rendu: () => React.ReactNode;
}

export function ConduiteNuit({
  game,
  onAction,
  onEtape,
  onResoudre,
  onLovers,
  onVol,
  onBaillon,
}: {
  game: GameDTO;
  onAction: (patch: PatchNuit) => void;
  onEtape: (index: number) => void;
  onResoudre: () => void;
  onLovers: (positions: number[]) => void;
  onVol: (position: number, avec: number) => void;
  onBaillon: (position: number) => void;
}) {
  const etapes = useMemo(
    () => construire(game, { onAction, onLovers, onVol, onBaillon }),
    [game, onAction, onLovers, onVol, onBaillon],
  );

  const { conseils } = useConseils();
  const nuit = game.nuit ?? {};
  const index = Math.min(Math.max(nuit.etape ?? 0, 0), Math.max(etapes.length - 1, 0));
  const etape = etapes[index];

  if (etapes.length === 0 || !etape) {
    return (
      <div className="surface p-5">
        <p className="text-sm text-muted-foreground">
          Plus aucun rôle à appeler : tous les porteurs de pouvoir nocturne ont été éliminés.
        </p>
        <Button className="mt-4 w-full py-4" onClick={onResoudre}>
          ☀️ Lever du jour
        </Button>
      </div>
    );
  }

  const dernier = index >= etapes.length - 1;
  const pret = etape.pret();

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
          <RoleSigil role={etape.role} />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-black">{etape.role.name}</h2>
            <p className="truncate text-[11px] text-muted-foreground">
              {game.seats
                .filter((s) => s.roleId === etape.role.id)
                .map((s) => `${s.name || `Place ${s.position}`}${s.alive ? "" : " †"}`)
                .join(", ") || "—"}
            </p>
          </div>
        </div>

        <p className="mt-4 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm font-semibold text-primary">
          {etape.appel}
        </p>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{etape.consigne}</p>

        {conseils && (
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
          disabled={index === 0}
          onClick={() => onEtape(index - 1)}
        >
          ← Précédent
        </Button>
        {dernier ? (
          <Button className="flex-1" disabled={!pret} onClick={onResoudre}>
            ☀️ Lever du jour
          </Button>
        ) : (
          <Button className="flex-1" disabled={!pret} onClick={() => onEtape(index + 1)}>
            Suivant →
          </Button>
        )}
      </div>

      {!pret && (
        <p className="text-center text-[11px] text-destructive">
          Cette étape attend une désignation avant de continuer.
        </p>
      )}

      {dernier && (
        <p className="rounded-xl border border-border bg-secondary p-3 text-center text-sm italic">
          {CLOTURE}
        </p>
      )}

      <BoutonAide role={etape.role} />
    </div>
  );
}

/**
 * Aide à la demande.
 *
 * La description du rôle n'occupe plus l'écran en permanence : elle est là
 * si le Maître du Jeu la cherche, invisible le reste du temps.
 */
export function BoutonAide({ role }: { role: Role }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <button
        onClick={() => setOuvert(true)}
        className="mx-auto flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-[11px] text-muted-foreground"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border font-semibold">
          ?
        </span>
        Aide
      </button>

      <Modal open={ouvert} onClose={() => setOuvert(false)}>
        <h2 className="font-display text-xl font-black">{role.name}</h2>
        <CampBadge camp={role.camp} className="mt-2" />
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{role.short}</p>
        <Button variant="ghost" className="mt-5 w-full" onClick={() => setOuvert(false)}>
          Fermer
        </Button>
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Briques d'affichage                                                 */
/* ------------------------------------------------------------------ */

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

function Annuler({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-[11px] text-muted-foreground"
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Construction des étapes                                             */
/* ------------------------------------------------------------------ */

/** Les deux voisins encore en jeu, la table étant un cercle. */
function voisinsVivants(vivants: SeatDTO[], position: number): SeatDTO[] {
  const i = vivants.findIndex((s) => s.position === position);
  if (i === -1 || vivants.length < 3) return [];
  return [vivants[(i - 1 + vivants.length) % vivants.length]!, vivants[(i + 1) % vivants.length]!];
}

function construire(
  game: GameDTO,
  actions: {
    onAction: (patch: PatchNuit) => void;
    onLovers: (positions: number[]) => void;
    onVol: (position: number, avec: number) => void;
    onBaillon: (position: number) => void;
  },
): Etape[] {
  const { onAction, onLovers, onVol, onBaillon } = actions;
  const nuit = game.nuit ?? {};
  const etat = game.hostState ?? {};
  const vivants = game.seats.filter((s) => s.alive);
  const enJeu = new Set(vivants.map((s) => s.roleId).filter(Boolean) as string[]);
  const porteur = (id: string) => vivants.find((s) => s.roleId === id);
  const convertis = etat.devenusLoups ?? [];

  const nom = (p: number) => game.seats.find((s) => s.position === p)?.name || `Place ${p}`;
  const roleDe = (p: number) => {
    const id = game.seats.find((s) => s.position === p)?.roleId;
    return id ? ROLES_BY_ID[id] : undefined;
  };
  const estLoup = (s: SeatDTO) => {
    const r = s.roleId ? ROLES_BY_ID[s.roleId] : undefined;
    return r?.camp === "loups" || r?.id === "loup-garou-blanc" || convertis.includes(s.position);
  };

  const premiere = game.night <= 1;
  const R = (id: string) => ROLES_BY_ID[id]!;
  const e: Etape[] = [];
  const ok = () => true;

  /* ---- Cupidon, puis les Amoureux ---- */
  if (enJeu.has("cupidon") && premiere) {
    e.push({
      id: "cupidon",
      role: R("cupidon"),
      appel: "« Cupidon se réveille et désigne les deux Amoureux. »",
      consigne: "Touchez les deux joueurs qu'il désigne. Il peut se choisir lui-même.",
      aide: "Les Amoureux meurent ensemble. Si le couple est mixte — un Villageois avec un Loup — leur but change : ils doivent éliminer tout le monde pour gagner à deux.",
      pret: () => game.seats.filter((s) => s.loverGroup).length === 2,
      rendu: () => {
        const couple = game.seats.filter((s) => s.loverGroup).map((s) => s.position);
        return (
          <>
            <Profils
              joueurs={vivants}
              choisis={couple}
              sur={(p) =>
                onLovers(
                  couple.includes(p) ? couple.filter((x) => x !== p) : [...couple, p].slice(-2),
                )
              }
              nom={nom}
              roleDe={roleDe}
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              {couple.length} sur 2 désignés.
            </p>
          </>
        );
      },
    });
    e.push({
      id: "amoureux",
      role: R("amoureux"),
      appel: "« Les Amoureux se réveillent et se reconnaissent. »",
      consigne:
        "Tapez sur la tête de ces deux joueurs pour qu'ils ouvrent les yeux. Trois secondes en silence, puis rendormez-les.",
      aide: "Eux seuls se connaissent. Un Amoureux ne doit jamais nuire à l'autre, même pour faire semblant.",
      pret: ok,
      rendu: () => {
        const couple = game.seats.filter((s) => s.loverGroup);
        if (couple.length !== 2)
          return <p className="text-xs text-destructive">Aucun couple désigné.</p>;
        return (
          <div className="flex flex-col gap-2">
            {couple.map((s) => (
              <FicheJoueur key={s.position} nom={nom(s.position)} role={roleDe(s.position)} />
            ))}
          </div>
        );
      },
    });
  }

  /* ---- Enfant Sauvage ---- */
  const enfant = porteur("enfant-sauvage");
  if (enfant && premiere) {
    e.push({
      id: "enfant-sauvage",
      role: R("enfant-sauvage"),
      appel: "« L'Enfant Sauvage se réveille et choisit son modèle. »",
      consigne: "Touchez le joueur qu'il désigne comme modèle.",
      aide: "Tant que son modèle vit, il est villageois. Si le modèle meurt, il rejoint la meute — l'application le suit toute seule.",
      pret: () => nuit.modele !== undefined,
      rendu: () => (
        <Profils
          joueurs={vivants.filter((s) => s.position !== enfant.position)}
          choisis={nuit.modele !== undefined ? [nuit.modele] : []}
          sur={(p) => onAction({ modele: nuit.modele === p ? null : p })}
          nom={nom}
          roleDe={roleDe}
        />
      ),
    });
  }

  /* ---- Chien-Loup ---- */
  if (enJeu.has("chien-loup") && premiere) {
    e.push({
      id: "chien-loup",
      role: R("chien-loup"),
      appel: "« Le Chien-Loup se réveille et choisit son camp. »",
      consigne: "Il indique d'un signe Villageois ou Loup-Garou. Choix définitif et secret.",
      aide: "S'il choisit la meute, il se réveille avec elle dès cette nuit. Son camp n'est jamais révélé, même à sa mort.",
      pret: () => (nuit.chienLoup ?? etat.chienLoup) !== undefined,
      rendu: () => {
        const valeur = nuit.chienLoup ?? etat.chienLoup;
        return (
          <div className="flex gap-2">
            {(
              [
                ["villageois", "🧑‍🌾 Villageois"],
                ["loups", "🐺 Loup-Garou"],
              ] as ["villageois" | "loups", string][]
            ).map(([v, label]) => (
              <button
                key={v}
                onClick={() => onAction({ chienLoup: v })}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-4 text-xs font-semibold",
                  valeur === v
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-secondary",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        );
      },
    });
  }

  /* ---- Fratries ---- */
  for (const [id, appel] of [
    ["soeurs", "« Les Deux Sœurs se réveillent et se reconnaissent. »"],
    ["freres", "« Les Trois Frères se réveillent et se reconnaissent. »"],
  ] as [string, string][]) {
    if (enJeu.has(id) && premiere) {
      e.push({
        id,
        role: R(id),
        appel,
        consigne: "Trois secondes en silence, sans un mot, puis rendormez-les.",
        aide: "Elles se connaissent dès la première nuit. Vous pouvez les réveiller de nouveau plus tard, au gré de la partie.",
        pret: ok,
        rendu: () => (
          <div className="flex flex-col gap-2">
            {game.seats
              .filter((s) => s.roleId === id && s.alive)
              .map((s) => (
                <FicheJoueur key={s.position} nom={nom(s.position)} role={roleDe(s.position)} />
              ))}
          </div>
        ),
      });
    }
  }

  /* ---- Comédien ---- */
  if (enJeu.has("comedien")) {
    const cartes = game.comedienCartes ?? [];
    e.push({
      id: "comedien",
      role: R("comedien"),
      appel: "« Le Comédien se réveille et choisit une carte au centre. »",
      consigne:
        "Lisez-lui les trois rôles à voix haute, dans l'ordre, et demandez-lui le numéro. Touchez celui qu'il annonce : il joue ce pouvoir jusqu'à demain soir, puis la carte quitte le jeu.",
      aide: "Les trois cartes viennent du centre, jamais des joueurs : personne n'est dépossédé. Aucune carte de Loup-Garou parmi elles. Appelez ensuite le rôle choisi à son tour dans la nuit.",
      pret: () => nuit.comedien !== undefined,
      rendu: () => (
        <>
          <div className="flex flex-col gap-2">
            {cartes.map((id, i) => {
              const r = ROLES_BY_ID[id];
              const choisi = nuit.comedien === id;
              return (
                <button
                  key={id}
                  onClick={() => onAction({ comedien: choisi ? null : id })}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-left",
                    choisi
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-secondary",
                  )}
                >
                  <span className="w-5 text-center text-sm font-semibold tabular-nums">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold">{r?.name ?? id}</span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {r?.short}
                    </span>
                  </span>
                </button>
              );
            })}
            {cartes.length === 0 && (
              <p className="text-xs text-destructive">
                Aucune carte n'a été posée au centre pour le Comédien.
              </p>
            )}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Ne montrez pas cet écran : les trois rôles se disent à voix haute, il répond par un
            numéro.
          </p>
        </>
      ),
    });
  }

  /* ---- Salvateur ---- */
  if (enJeu.has("salvateur")) {
    e.push({
      id: "salvateur",
      role: R("salvateur"),
      appel: "« Le Salvateur se réveille et désigne qui il protège. »",
      consigne: "Touchez le joueur protégé. Il a le droit de se protéger lui-même.",
      aide: "La protection arrête les Loups, mais pas le poison, pas le charme du Flûtiste, pas l'infection — et elle est sans effet sur la Petite Fille.",
      pret: () => nuit.protection !== undefined,
      rendu: () => (
        <>
          <Profils
            joueurs={vivants.filter((s) => s.position !== etat.protectionPrecedente)}
            choisis={nuit.protection !== undefined ? [nuit.protection] : []}
            sur={(p) => onAction({ protection: nuit.protection === p ? null : p })}
            nom={nom}
            roleDe={roleDe}
          />
          {etat.protectionPrecedente ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {nom(etat.protectionPrecedente)} n'apparaît pas : déjà protégé la nuit dernière.
            </p>
          ) : null}
        </>
      ),
    });
  }

  /* ---- Voyante : désignation puis carte ---- */
  const voyante = porteur("voyante");
  if (voyante) {
    e.push({
      id: "voyante-choix",
      role: R("voyante"),
      appel: "« La Voyante se réveille et désigne un joueur. »",
      consigne: "Touchez le joueur qu'elle sonde. Sa carte s'ouvrira à l'écran suivant.",
      aide: "Elle voit une carte par nuit. À elle de rester discrète : repérée, elle ne fait pas long feu.",
      pret: () => nuit.voyante !== undefined,
      rendu: () => (
        <Profils
          joueurs={vivants.filter((s) => s.position !== voyante.position)}
          choisis={nuit.voyante !== undefined ? [nuit.voyante] : []}
          sur={(p) => onAction({ voyante: nuit.voyante === p ? null : p })}
          nom={nom}
          roleDe={roleDe}
        />
      ),
    });
    e.push({
      id: "voyante-carte",
      role: R("voyante"),
      appel: "Montrez-lui cette carte, à l'abri de tous les regards.",
      consigne:
        "Tournez l'écran vers elle seule, le temps qu'elle regarde, puis reprenez le téléphone.",
      aide: "Ne dites rien à voix haute : personne d'autre ne doit savoir ce qu'elle a vu.",
      pret: ok,
      rendu: () =>
        nuit.voyante === undefined ? (
          <p className="text-xs text-destructive">Aucun joueur désigné à l'étape précédente.</p>
        ) : (
          <FicheJoueur nom={nom(nuit.voyante)} role={roleDe(nuit.voyante)} />
        ),
    });
  }

  /* ---- Renard : flair puis réponse ---- */
  const renard = porteur("renard");
  if (renard && !(etat.pouvoirsUtilises ?? []).includes("renard")) {
    e.push({
      id: "renard-choix",
      role: R("renard"),
      appel: "« Le Renard se réveille et flaire un groupe de trois. »",
      consigne:
        "Il montre du doigt le joueur central d'un trio de voisins. Touchez ce joueur : la réponse s'affiche à l'écran suivant.",
      aide: "Les éliminés ne comptent pas dans le trio. Il n'est jamais obligé de flairer.",
      pret: () => nuit.renard !== undefined,
      rendu: () => (
        <Profils
          joueurs={vivants}
          choisis={nuit.renard !== undefined ? [nuit.renard] : []}
          sur={(p) => onAction({ renard: nuit.renard === p ? null : p })}
          nom={nom}
          roleDe={roleDe}
        />
      ),
    });
    e.push({
      id: "renard-reponse",
      role: R("renard"),
      appel: "Répondez-lui d'un signe de tête, sans un mot.",
      consigne:
        "Si la réponse est non, il perd définitivement son pouvoir : cochez-le dans « Pouvoirs à usage unique », plus bas sur cet écran.",
      aide: "Une réponse positive lui laisse son flair pour les nuits suivantes.",
      pret: ok,
      rendu: () => {
        if (nuit.renard === undefined)
          return <p className="text-xs text-destructive">Aucun trio désigné.</p>;
        const centre = vivants.find((s) => s.position === nuit.renard);
        const trio = centre ? [centre, ...voisinsVivants(vivants, nuit.renard)] : [];
        const oui = trio.some(estLoup);
        return (
          <>
            <p
              className={cn(
                "rounded-xl border p-4 text-center font-display text-2xl font-black",
                oui
                  ? "border-destructive/60 bg-destructive/15 text-destructive"
                  : "border-border bg-secondary text-muted-foreground",
              )}
            >
              {oui ? "OUI — au moins un Loup" : "NON — aucun Loup"}
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Trio flairé : {trio.map((s) => nom(s.position)).join(", ")}.
            </p>
          </>
        );
      },
    });
  }

  /* ---- La meute ---- */
  if (vivants.some(estLoup)) {
    e.push({
      id: "loups",
      role: R("loup-garou"),
      appel: "« Les Loups-Garous se réveillent, se reconnaissent et désignent leur victime. »",
      consigne:
        "Laissez-leur le temps de se mettre d'accord en silence, puis touchez la victime. Elle ne mourra qu'au lever du jour.",
      aide: "La Petite Fille peut espionner pendant ce tour : ne l'appelez jamais. Surprise par un Loup, elle peut être dévorée à la place de la victime désignée.",
      pret: () => nuit.victimeLoups !== undefined,
      rendu: () => (
        <>
          <Profils
            joueurs={vivants.filter((s) => !estLoup(s))}
            choisis={nuit.victimeLoups !== undefined ? [nuit.victimeLoups] : []}
            sur={(p) => onAction({ victimeLoups: nuit.victimeLoups === p ? null : p })}
            nom={nom}
            roleDe={roleDe}
          />
          <p className="mt-2 text-[11px] text-muted-foreground">
            Meute :{" "}
            {vivants
              .filter(estLoup)
              .map((s) => nom(s.position))
              .join(", ")}
            .
          </p>
        </>
      ),
    });
  }

  /* ---- Loup-Garou Blanc, une nuit sur deux ---- */
  const blanc = porteur("loup-garou-blanc");
  if (blanc && game.night % 2 === 0) {
    e.push({
      id: "loup-blanc",
      role: R("loup-garou-blanc"),
      appel: "« Le Loup-Garou Blanc se réveille seul. »",
      consigne: "Il peut dévorer un Loup-Garou, ou ne rien faire. Touchez sa victime, ou passez.",
      aide: "Il gagne seul, en restant l'unique survivant. Ce réveil solitaire revient une nuit sur deux et n'est jamais obligatoire.",
      pret: ok,
      rendu: () => (
        <>
          <Profils
            joueurs={vivants.filter((s) => estLoup(s) && s.position !== blanc.position)}
            choisis={nuit.loupBlanc !== undefined ? [nuit.loupBlanc] : []}
            sur={(p) => onAction({ loupBlanc: nuit.loupBlanc === p ? null : p })}
            nom={nom}
            roleDe={roleDe}
          />
          {nuit.loupBlanc !== undefined && (
            <Annuler onClick={() => onAction({ loupBlanc: null })}>
              Finalement, il ne dévore personne
            </Annuler>
          )}
        </>
      ),
    });
  }

  /* ---- Infect Père des Loups ---- */
  if (enJeu.has("infect-pere-des-loups") && !etat.infectionUtilisee) {
    e.push({
      id: "infect-pere",
      role: R("infect-pere-des-loups"),
      appel: "« L'Infect Père des Loups peut infecter la victime. »",
      consigne:
        "Une seule fois dans la partie. S'il infecte, la victime survit, garde son pouvoir et rejoint secrètement la meute : touchez-la discrètement au lever du jour.",
      aide: "Ni le Salvateur ni la Sorcière n'empêchent l'infection. L'Ancien y résiste à sa première morsure.",
      pret: ok,
      rendu: () =>
        nuit.victimeLoups === undefined ? (
          <p className="text-xs text-muted-foreground">
            Aucune victime désignée : personne à infecter cette nuit.
          </p>
        ) : (
          <button
            onClick={() => onAction({ infection: !nuit.infection })}
            className={cn(
              "w-full rounded-xl border px-3 py-4 text-sm font-semibold",
              nuit.infection
                ? "border-destructive bg-destructive/15 text-destructive"
                : "border-border bg-secondary text-muted-foreground",
            )}
          >
            {nuit.infection
              ? `🩸 ${nom(nuit.victimeLoups)} est infecté au lieu d'être dévoré`
              : `🩸 Infecter ${nom(nuit.victimeLoups)}`}
          </button>
        ),
    });
  }

  /* ---- Grand Méchant Loup ---- */
  const loupTombe = game.seats.some(
    (s) =>
      !s.alive &&
      s.roleId &&
      (ROLES_BY_ID[s.roleId]?.camp === "loups" ||
        s.roleId === "enfant-sauvage" ||
        s.roleId === "chien-loup"),
  );
  if (enJeu.has("grand-mechant-loup") && !loupTombe) {
    e.push({
      id: "grand-mechant-loup",
      role: R("grand-mechant-loup"),
      appel: "« Le Grand Méchant Loup se réveille et dévore une seconde victime. »",
      consigne: "Touchez sa seconde victime. Elle ne peut pas être un Loup-Garou.",
      aide: "Ce second repas disparaît définitivement dès qu'un Loup, l'Enfant Sauvage ou le Chien-Loup est éliminé.",
      pret: () => nuit.secondeVictime !== undefined,
      rendu: () => (
        <Profils
          joueurs={vivants.filter((s) => !estLoup(s) && s.position !== nuit.victimeLoups)}
          choisis={nuit.secondeVictime !== undefined ? [nuit.secondeVictime] : []}
          sur={(p) => onAction({ secondeVictime: nuit.secondeVictime === p ? null : p })}
          nom={nom}
          roleDe={roleDe}
        />
      ),
    });
  }

  /* ---- Sorcière : un seul écran, puis les cibles si elle empoisonne ---- */
  const sorciere = porteur("sorciere");
  if (sorciere) {
    const vieDispo = etat.potionVie !== false;
    const mortDispo = etat.potionMort !== false;
    const victimeSoignable = vieDispo && nuit.victimeLoups !== undefined && !nuit.infection;

    e.push({
      id: "sorciere",
      role: R("sorciere"),
      appel: "« La Sorcière se réveille. »",
      consigne:
        "Montrez-lui la victime des Loups et l'état de ses potions. Elle sauve, elle empoisonne, elle fait les deux, ou elle ne fait rien.",
      aide: "Chaque potion ne sert qu'une fois dans la partie, mais elle peut verser les deux la même nuit. Elle peut se sauver elle-même. Le poison ignore la protection du Salvateur.",
      pret: ok,
      rendu: () => (
        <>
          {nuit.victimeLoups === undefined ? (
            <p className="text-xs text-muted-foreground">
              Aucune victime cette nuit : il n'y a personne à lui montrer.
            </p>
          ) : nuit.infection ? (
            <p className="text-xs text-muted-foreground">
              La victime est infectée, elle ne meurt pas : la potion de vie n'a rien à faire ici.
            </p>
          ) : (
            <FicheJoueur nom={nom(nuit.victimeLoups)} role={roleDe(nuit.victimeLoups)} />
          )}

          <div className="mt-3 flex flex-col gap-2">
            <button
              disabled={!victimeSoignable}
              onClick={() =>
                onAction({ soin: nuit.soin !== undefined ? null : (nuit.victimeLoups ?? null) })
              }
              className={cn(
                "w-full rounded-xl border px-3 py-4 text-sm font-semibold disabled:opacity-35",
                nuit.soin !== undefined
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-secondary",
              )}
            >
              {!vieDispo
                ? "Potion de vie — déjà versée"
                : nuit.soin !== undefined
                  ? "Potion de vie versée — la victime est sauvée"
                  : "Potion de vie"}
            </button>

            <button
              disabled={!mortDispo}
              onClick={() =>
                onAction(
                  nuit.poisonVoulu ? { poisonVoulu: null, poison: null } : { poisonVoulu: true },
                )
              }
              className={cn(
                "w-full rounded-xl border px-3 py-4 text-sm font-semibold disabled:opacity-35",
                nuit.poisonVoulu
                  ? "border-destructive bg-destructive/15 text-destructive"
                  : "border-border bg-secondary",
              )}
            >
              {!mortDispo
                ? "Potion de mort — déjà versée"
                : nuit.poisonVoulu
                  ? "Potion de mort — choisissez la victime à l'écran suivant"
                  : "Potion de mort"}
            </button>
          </div>
        </>
      ),
    });

    if (nuit.poisonVoulu && mortDispo) {
      e.push({
        id: "sorciere-cible",
        role: R("sorciere"),
        appel: "Qui empoisonne-t-elle ?",
        consigne: "Touchez sa victime, puis rendormez-la.",
        aide: "Le poison tue l'Ancien du premier coup, et le village perd alors tous ses pouvoirs.",
        pret: () => nuit.poison !== undefined,
        rendu: () => (
          <>
            <Profils
              joueurs={vivants.filter(
                (x) => x.position !== sorciere.position && x.position !== nuit.soin,
              )}
              choisis={nuit.poison !== undefined ? [nuit.poison] : []}
              sur={(p) => onAction({ poison: nuit.poison === p ? null : p })}
              nom={nom}
              roleDe={roleDe}
            />
            <Annuler onClick={() => onAction({ poisonVoulu: null, poison: null })}>
              Finalement, elle n'empoisonne personne
            </Annuler>
          </>
        ),
      });
    }
  }

  /* ---- Joueur de Flûte ---- */
  const flutiste = porteur("joueur-de-flute");
  if (flutiste) {
    const deja = etat.charmed ?? [];
    const charmables = vivants.filter(
      (s) => s.position !== flutiste.position && !deja.includes(s.position),
    );
    const attendu = Math.min(2, charmables.length);
    e.push({
      id: "flute",
      role: R("joueur-de-flute"),
      appel: "« Le Joueur de Flûte se réveille et envoûte deux joueurs. »",
      consigne:
        "Touchez les deux nouveaux envoûtés, puis réveillez tous les envoûtés — anciens et nouveaux — pour qu'ils se reconnaissent.",
      aide: "Il gagne seul dès qu'il ne reste que des envoûtés. Il ne peut pas s'envoûter lui-même ; ni le Salvateur ni la Sorcière ne protègent du charme.",
      pret: () => (nuit.charmes ?? []).length >= attendu,
      rendu: () => {
        const choisis = nuit.charmes ?? [];
        return (
          <>
            <Profils
              joueurs={charmables}
              choisis={choisis}
              sur={(p) =>
                onAction({
                  charmes: choisis.includes(p)
                    ? choisis.filter((x) => x !== p)
                    : [...choisis, p].slice(-2),
                })
              }
              nom={nom}
              roleDe={roleDe}
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              {deja.length} déjà envoûté{deja.length > 1 ? "s" : ""} (grisés) · {choisis.length} sur{" "}
              {attendu} cette nuit.
            </p>
          </>
        );
      },
    });
  }

  /* ---- Magicien, tout à la fin ---- */
  if (enJeu.has("magicien")) {
    e.push({
      id: "magicien",
      role: R("magicien"),
      appel: "« Le Magicien se réveille et désigne un habitant à faire taire. »",
      consigne: game.singleDevice
        ? "Touchez le joueur muselé pour le débat de demain, puis prévenez-le avant la fin de la nuit : une tape sur l'épaule pendant qu'il a les yeux fermés, ou un mot à l'oreille au moment du réveil."
        : "Touchez le joueur muselé pour le débat de demain. Le bâillon s'affiche aussitôt sur son téléphone : il sera prévenu avant même que la nuit se termine.",
      aide: "Le muselé garde son droit de vote et peut communiquer par gestes, mais ne prononce pas un mot. Il doit le savoir avant l'ouverture du débat, sans quoi il parlera sans le vouloir. Rôle maison, absent du jeu officiel.",
      pret: () => game.seats.some((s) => s.statuses.includes("baillonne")),
      rendu: () => (
        <Profils
          joueurs={vivants}
          choisis={game.seats
            .filter((s) => s.statuses.includes("baillonne"))
            .map((s) => s.position)}
          sur={(p) => onBaillon(p)}
          nom={nom}
          roleDe={roleDe}
        />
      ),
    });
  }

  /* ---- Voleur ---- */
  const voleur = porteur("voleur");
  if (voleur && (premiere || game.thiefVariant === "echange")) {
    const echange = game.thiefVariant === "echange";
    e.push({
      id: "voleur",
      role: R("voleur"),
      appel: "« Le Voleur se réveille, en tout dernier. »",
      consigne: echange
        ? "Touchez le joueur avec qui il échange sa carte. L'échange est immédiat : les deux devront revoir leur carte au réveil."
        : "Montrez-lui les deux cartes du centre. Il en prend une, définitivement.",
      aide: "Il vole une identité à la toute fin de la nuit, quand tous les autres ont déjà agi. Le rôle volé change de mains sur-le-champ : au réveil, les deux joueurs devront revérifier leur carte.",
      pret: () => !echange || nuit.voleurEchange !== undefined,
      rendu: () =>
        echange ? (
          <Profils
            joueurs={vivants.filter((s) => s.position !== voleur.position)}
            choisis={nuit.voleurEchange !== undefined ? [nuit.voleurEchange] : []}
            sur={(p) => {
              onVol(voleur.position, p);
              onAction({ voleurEchange: p });
            }}
            nom={nom}
            roleDe={roleDe}
          />
        ) : (
          <p className="text-xs text-muted-foreground">
            Cartes au centre :{" "}
            {game.centerCards.map((id) => ROLES_BY_ID[id]?.name ?? id).join(" · ") || "aucune"}
          </p>
        ),
    });
  }

  return e;
}
