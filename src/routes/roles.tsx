import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CampBadge,
  Modal,
  PageHeader,
  RoleDetail,
  RoleSigil,
} from "@/components/ui-kit";
import { CAMP_LABEL, ROLES, type Camp, type Role } from "@/data/roles";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/roles")({
  head: () => ({
    meta: [
      { title: "Toutes les cartes du Loup-Garou — extensions incluses" },
      {
        name: "description",
        content:
          "Le pouvoir de chaque carte du Loup-Garou de Thiercelieux : jeu de base, Nouvelle Lune, Personnages, Le Village et Le Pacte.",
      },
      { property: "og:title", content: "Toutes les cartes du Loup-Garou" },
      {
        property: "og:description",
        content: "Description complète du pouvoir de chaque rôle, extension par extension.",
      },
    ],
  }),
  component: Roles,
});

const CAMPS: (Camp | "toutes")[] = ["toutes", "loups", "villageois", "special", "solitaire"];

function Roles() {
  const [ext, setExt] = useState<Camp | "toutes">("toutes");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Role | null>(null);

  const liste = useMemo(
    () =>
      ROLES.filter((r) => ext === "toutes" || r.camp === ext).filter((r) =>
        r.name.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [ext, q],
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-10 pb-16">
      <PageHeader
        title="Les cartes"
        subtitle={`${ROLES.length} rôles, tous camps confondus. Touchez une carte pour lire son pouvoir.`}
        back="/"
      />

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher un rôle…"
        className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:border-primary"
      />

      <div className="-mx-5 my-4 flex gap-2 overflow-x-auto px-5 pb-1">
        {CAMPS.map((e) => (
          <button
            key={e}
            onClick={() => setExt(e)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold",
              ext === e
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-secondary text-muted-foreground",
            )}
          >
            {e === "toutes" ? "Toutes" : CAMP_LABEL[e]}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-2">
        {liste.map((role) => (
          <li key={role.id}>
            <button
              onClick={() => setDetail(role)}
              className="surface flex w-full items-center gap-3 p-3 text-left active:scale-[0.98]"
            >
              <RoleSigil role={role} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-display font-bold">{role.name}</span>
                  <CampBadge camp={role.camp} />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{role.short}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <Modal open={!!detail} onClose={() => setDetail(null)}>
        {detail && <RoleDetail role={detail} onClose={() => setDetail(null)} />}
      </Modal>
    </main>
  );
}
