import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

/**
 * Construction de l'application.
 *
 * Les plugins sont posés à la main, dans l'ordre qui compte : Tailwind et les
 * chemins `@/` d'abord, puis TanStack Start, le serveur Nitro à la
 * construction seulement, et React en dernier.
 */
export default defineConfig(({ command }) => ({
  // Lightning CSS transforme les feuilles de style : c'est lui qui préfixe et
  // réduit le CSS produit par Tailwind.
  css: { transformer: "lightningcss" },
  resolve: {
    alias: { "@": `${process.cwd()}/src` },
    // Un seul exemplaire de React et de TanStack Query, même si une dépendance
    // en embarque un autre : deux copies de React cassent les hooks.
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
    ignoreOutdatedRequests: true,
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // Le code côté navigateur n'a pas le droit d'importer ce qui vit sous
      // `server/` : la construction échoue plutôt que d'envoyer un secret.
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
      // Point d'entrée du serveur : src/server.ts, qui enveloppe le rendu.
      server: { entry: "server" },
    }),
    // Auto-hébergement : un serveur Node classique (`.output/server/index.mjs`).
    ...(command === "build" ? [nitro({ preset: "node-server" })] : []),
    viteReact(),
  ],
}));
