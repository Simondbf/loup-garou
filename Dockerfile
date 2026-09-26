# syntax=docker/dockerfile:1

# ---------- Étape 1 : construction ----------
FROM node:22-alpine AS build

WORKDIR /app

# Les dépendances d'abord : cette couche n'est reconstruite que si
# package.json ou package-lock.json changent.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Produit .output/server/index.mjs (preset nitro « node-server »)
# et .output/public (les fichiers statiques).
RUN npm run build


# ---------- Étape 2 : exécution ----------
FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Le serveur nitro est autonome : il embarque ses dépendances,
# inutile de recopier node_modules.
COPY --from=build /app/.output ./.output

# Pas de root pour faire tourner le serveur.
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
