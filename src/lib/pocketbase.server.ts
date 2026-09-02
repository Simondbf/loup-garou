/**
 * Accès PocketBase — côté serveur uniquement.
 *
 * PocketBase n'est jamais exposé sur Internet : il n'écoute que sur le réseau
 * Docker interne, et les collections n'ont aucune règle d'accès publique
 * (équivalent du « deny all » des politiques RLS de l'ancienne base Supabase).
 * Seul ce module s'y connecte, avec un compte superuser dédié.
 *
 * Ne jamais importer ce fichier depuis un composant ou une route : il doit
 * rester en dehors du bundle envoyé au navigateur. On l'importe dynamiquement
 * à l'intérieur des handlers de `createServerFn`.
 */

const PB_URL = (process.env["POCKETBASE_URL"] ?? "http://pocketbase:8090").replace(/\/+$/, "");

let cachedToken: string | null = null;

function credentials() {
  const identity = process.env["POCKETBASE_ADMIN_EMAIL"];
  const password = process.env["POCKETBASE_ADMIN_PASSWORD"];
  if (!identity || !password) {
    const manquantes = [
      ...(!identity ? ["POCKETBASE_ADMIN_EMAIL"] : []),
      ...(!password ? ["POCKETBASE_ADMIN_PASSWORD"] : []),
    ];
    throw new Error(`Variable(s) d'environnement manquante(s) : ${manquantes.join(", ")}`);
  }
  return { identity, password };
}

async function authentifier(): Promise<string> {
  const { identity, password } = credentials();
  const reponse = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identity, password }),
  });
  if (!reponse.ok) {
    throw new Error(`PocketBase : authentification refusée (${reponse.status})`);
  }
  const data = (await reponse.json()) as { token?: string };
  if (!data.token) throw new Error("PocketBase : jeton absent de la réponse d'authentification");
  cachedToken = data.token;
  return data.token;
}

async function appel(chemin: string, init: RequestInit = {}, reessai = true): Promise<unknown> {
  const token = cachedToken ?? (await authentifier());
  const reponse = await fetch(`${PB_URL}${chemin}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: token,
      ...(init.headers ?? {}),
    },
  });

  // Jeton expiré ou invalidé (redémarrage, rotation du mot de passe) : on
  // se réauthentifie une fois avant d'abandonner.
  if ((reponse.status === 401 || reponse.status === 403) && reessai) {
    cachedToken = null;
    return appel(chemin, init, false);
  }

  if (!reponse.ok) {
    let detail = "";
    try {
      const corps = (await reponse.json()) as { message?: string };
      detail = corps.message ? ` — ${corps.message}` : "";
    } catch {
      /* réponse non JSON */
    }
    throw new Error(`PocketBase ${reponse.status} sur ${chemin}${detail}`);
  }

  if (reponse.status === 204) return null;
  return reponse.json();
}

/* ------------------------------------------------------------------ */
/* Filtres                                                             */
/* ------------------------------------------------------------------ */

/**
 * Les filtres PocketBase sont des chaînes : l'API REST n'accepte pas de
 * paramètres liés. Toute valeur venant du client passe donc par cet
 * échappement avant d'être insérée dans un filtre.
 */
export function litteral(valeur: string | number | boolean): string {
  if (typeof valeur === "number") return Number.isFinite(valeur) ? String(valeur) : "0";
  if (typeof valeur === "boolean") return valeur ? "true" : "false";
  return `'${valeur.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

export type Enregistrement = Record<string, any>;

interface ReponseListe {
  items: Enregistrement[];
}

/* ------------------------------------------------------------------ */
/* Opérations                                                          */
/* ------------------------------------------------------------------ */

export const pb = {
  /** Liste les enregistrements correspondant au filtre (500 max, suffisant ici). */
  async liste(
    collection: string,
    options: { filtre?: string; tri?: string; parPage?: number } = {},
  ): Promise<Enregistrement[]> {
    const params = new URLSearchParams({ perPage: String(options.parPage ?? 500) });
    if (options.filtre) params.set("filter", options.filtre);
    if (options.tri) params.set("sort", options.tri);
    const data = (await appel(
      `/api/collections/${collection}/records?${params.toString()}`,
    )) as ReponseListe;
    return data.items ?? [];
  },

  /** Premier enregistrement correspondant au filtre, ou null. */
  async premier(collection: string, filtre: string, tri?: string): Promise<Enregistrement | null> {
    const items = await pb.liste(collection, { filtre, parPage: 1, ...(tri ? { tri } : {}) });
    return items[0] ?? null;
  },

  async creer(collection: string, donnees: Enregistrement): Promise<Enregistrement> {
    return (await appel(`/api/collections/${collection}/records`, {
      method: "POST",
      body: JSON.stringify(donnees),
    })) as Enregistrement;
  },

  async modifier(collection: string, id: string, donnees: Enregistrement): Promise<Enregistrement> {
    return (await appel(`/api/collections/${collection}/records/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(donnees),
    })) as Enregistrement;
  },

  async supprimer(collection: string, id: string): Promise<void> {
    await appel(`/api/collections/${collection}/records/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};
