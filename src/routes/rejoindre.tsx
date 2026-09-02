import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button, PageHeader } from "@/components/ui-kit";
import { claimSeats } from "@/lib/party.functions";
import { useGame } from "@/lib/game-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/rejoindre")({
  head: () => ({
    meta: [
      { title: "Rejoindre une partie de Loup-Garou avec un code" },
      {
        name: "description",
        content:
          "Entrez le code donné par le Maître du Jeu et indiquez combien de joueurs partagent ce téléphone.",
      },
      { property: "og:title", content: "Rejoindre une partie de Loup-Garou" },
      {
        property: "og:description",
        content: "Un code à quatre lettres suffit pour prendre sa place dans le village.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Rejoindre,
});

function Rejoindre() {
  const navigate = useNavigate();
  const { token, saveSession, apply } = useGame();
  const [code, setCode] = useState("");
  const [count, setCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function rejoindre() {
    setBusy(true);
    setErreur(null);
    try {
      const dto = await claimSeats({
        data: { code: code.trim().toUpperCase(), token, count },
      });
      saveSession({ code: dto.code, host: false });
      apply(dto);
      await navigate({ to: "/distribution" });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de rejoindre");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-10 pb-16">
      <PageHeader
        title="Rejoindre"
        subtitle="Le Maître du Jeu vous a donné un code à quatre lettres."
        back="/"
      />

      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
        placeholder="CODE"
        autoCapitalize="characters"
        className="w-full rounded-xl border border-border bg-input px-4 py-5 text-center font-display text-3xl font-black tracking-[0.5em] outline-none focus:border-primary"
      />

      <div className="surface mt-6 p-4">
        <p className="font-display text-sm font-bold">
          Combien de joueurs sur ce téléphone ?
        </p>
        <div className="mt-3 flex gap-2">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              onClick={() => setCount(n)}
              className={cn(
                "flex-1 rounded-xl border py-2.5 text-sm font-bold",
                count === n
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-secondary text-muted-foreground",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {erreur && <p className="mt-4 text-center text-xs text-destructive">{erreur}</p>}

      <Button
        className="mt-6 w-full py-4"
        disabled={code.length !== 4 || busy}
        onClick={() => void rejoindre()}
      >
        {busy ? "Connexion…" : "Prendre ma place"}
      </Button>
    </main>
  );
}
