import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button, CampBadge, PageHeader, RoleArt } from "@/components/ui-kit";
import { CAMP_LABEL, ROLES_BY_ID } from "@/data/roles";
import { useGame } from "@/lib/game-store";
import { markSeen, setSeatName } from "@/lib/party.functions";

export const Route = createFileRoute("/tour-de-table")({
  head: () => ({
    meta: [
      { title: "Tour de table — partie de Loup-Garou" },
      {
        name: "description",
        content:
          "Le téléphone passe de main en main : chacun entre son prénom et découvre sa carte dans la foulée.",
      },
    ],
  }),
  component: TourDeTable,
});

/**
 * Tour de table du mode « un seul téléphone ».
 *
 * L'ancien parcours demandait deux tours complets : un premier pour saisir
 * tous les prénoms, un second pour que chacun regarde sa carte. Ici le
 * téléphone ne circule qu'une fois : on entre son prénom, on découvre sa
 * carte dans la foulée, on passe l'appareil au voisin.
 *
 * L'écran ne montre jamais la liste des joueurs : une place à la fois, et un
 * écran de passage entre chaque pour que la carte ne reste pas affichée dans
 * les mains du suivant.
 */
type Etape = "prenom" | "carte" | "passage";

function TourDeTable() {
  const navigate = useNavigate();
  const { game, session, token, hydrated, apply } = useGame();
  const [index, setIndex] = useState(0);
  const [etape, setEtape] = useState<Etape>("prenom");
  const [prenom, setPrenom] = useState("");
  const [amorce, setAmorce] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (hydrated && !session) void navigate({ to: "/" });
  }, [hydrated, session, navigate]);

  // Premier affichage : si la partie reprend des joueurs connus, la première
  // place arrive avec son prénom déjà saisi.
  useEffect(() => {
    if (amorce || !game) return;
    setPrenom(game.seats.find((s) => s.position === 1)?.name ?? "");
    setAmorce(true);
  }, [amorce, game]);

  if (!game) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-16 text-center">
        <p className="text-sm text-muted-foreground">Préparation de la partie…</p>
      </main>
    );
  }

  const places = [...game.seats].sort((a, b) => a.position - b.position);
  const place = places[index];
  const total = places.length;
  const dernier = index >= total - 1;

  if (!place) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-16 text-center">
        <p className="text-sm text-muted-foreground">Aucune place à distribuer.</p>
      </main>
    );
  }

  const role = place.roleId ? ROLES_BY_ID[place.roleId] : undefined;

  async function decouvrir() {
    if (!game || !place) return;
    setBusy(true);
    try {
      const nom = prenom.trim().slice(0, 24);
      if (nom) {
        apply(
          await setSeatName({
            data: { code: game.code, token, position: place.position, name: nom },
          }),
        );
      }
      apply(await markSeen({ data: { code: game.code, token, position: place.position } }));
      setEtape("carte");
    } finally {
      setBusy(false);
    }
  }

  function suivant() {
    // Après une relance, les prénoms sont déjà là : on les repropose au lieu
    // de refaire tout le tour de table.
    setPrenom(places[index + 1]?.name ?? "");
    setIndex((i) => i + 1);
    setEtape("prenom");
  }

  /* ---------------- Saisie du prénom ---------------- */

  if (etape === "prenom") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-10 pb-16">
        <PageHeader
          title={`Joueur ${index + 1}`}
          subtitle={`Place ${place.position} sur ${total} — le téléphone est entre tes mains.`}
        />

        <div className="surface p-5">
          <label className="text-xs text-muted-foreground" htmlFor="prenom">
            Ton prénom
          </label>
          <input
            id="prenom"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value.slice(0, 24))}
            placeholder="Camille"
            autoComplete="off"
            autoFocus
            className="mt-2 w-full rounded-xl border border-border bg-input px-4 py-4 text-center font-display text-2xl outline-none focus:border-primary"
          />
          <p className="mt-3 text-[11px] text-muted-foreground">
            Ta carte s'affichera juste après. Assure-toi que personne ne regarde par-dessus ton
            épaule.
          </p>
          <Button
            className="mt-4 w-full py-4"
            disabled={busy || prenom.trim().length === 0}
            onClick={() => void decouvrir()}
          >
            {busy ? "…" : "🎴 Découvrir ma carte"}
          </Button>
        </div>

        <div className="mt-6 flex h-1 gap-1">
          {places.map((_, i) => (
            <span
              key={i}
              className={`flex-1 rounded-full ${i < index ? "bg-primary/60" : i === index ? "bg-primary" : "bg-border"}`}
            />
          ))}
        </div>
      </main>
    );
  }

  /* ---------------- Révélation de la carte ---------------- */

  if (etape === "carte") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-10 pb-16">
        <p className="text-center text-xs tracking-widest text-muted-foreground uppercase">
          {place.name || `Joueur ${index + 1}`} — ta carte
        </p>

        <div className="surface animate-rise mt-4 p-6 text-center">
          {role ? (
            <>
              <RoleArt role={role} className="mx-auto" />
              <h1 className="mt-4 font-display text-3xl font-black">{role.name}</h1>
              <CampBadge camp={role.camp} className="mt-3" />
              <p className="mt-4 text-sm font-semibold">{role.short}</p>
              <p className="mt-3 text-left text-xs leading-relaxed whitespace-pre-line text-muted-foreground">
                {role.description}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Carte non distribuée.</p>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Retiens ton rôle. Tu ne pourras pas revenir en arrière : seul le Maître du Jeu peut
          rouvrir une carte.
        </p>

        {/* Pas d'écran intermédiaire : le joueur valide et l'écran suivant est
            déjà la saisie du prénom du voisin, donc sa carte est cachée au
            moment où il passe le téléphone. */}
        <Button
          className="mt-4 w-full py-4"
          onClick={() => (dernier ? setEtape("passage") : suivant())}
        >
          {dernier ? "✅ Terminé, rendre le téléphone au Maître du Jeu" : "✅ J'ai vu, au suivant"}
        </Button>
      </main>
    );
  }

  /* ---------------- Fin du tour ---------------- */

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 pb-16 text-center">
      <p className="text-5xl">🌙</p>
      <h1 className="mt-4 font-display text-2xl font-black">Tout le monde a sa carte</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Rends le téléphone au Maître du Jeu. La première nuit peut commencer.
      </p>
      <Button className="mt-8 w-full py-4" onClick={() => void navigate({ to: "/maitre" })}>
        🎭 Ouvrir le tableau du Maître du Jeu
      </Button>
    </main>
  );
}
