#!/usr/bin/env bash
#
# Mise à jour de l'application sur le serveur.
#
#   cd /srv/lg   (ou ~/lg)
#   ./maj.sh
#
# Équivalent des scripts « maj » des autres projets, adapté à une pile
# Docker : on récupère le code, on reconstruit l'image, on redémarre, puis
# on vérifie que le serveur répond avant de rendre la main.

set -euo pipefail
cd "$(dirname "$0")"

# Port publié, lu directement dans docker-compose.yml pour ne pas se
# désynchroniser si tu le changes là-bas.
PORT="$(grep -oE '127\.0\.0\.1:[0-9]+:3000' docker-compose.yml | cut -d: -f2)"
PORT="${PORT:-3010}"

echo "→ Récupération du code"
git pull --ff-only

echo "→ Reconstruction et redémarrage"
docker compose up -d --build

echo "→ Vérification (port ${PORT})"
for essai in $(seq 1 20); do
  code="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/" 2>/dev/null || echo 000)"
  if [ "$code" = "200" ]; then
    echo "✅ L'application répond (HTTP 200)."
    exit 0
  fi
  sleep 2
done

echo "❌ Pas de réponse après 40 s. Journaux :"
docker compose logs --tail 40 app
exit 1
