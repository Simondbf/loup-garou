# Déploiement — lg.soleiljaune.be

L'application tourne en deux conteneurs :

| Conteneur | Rôle | Exposition |
|---|---|---|
| `lg-app` | serveur Node (TanStack Start) | `127.0.0.1:3005` sur le VPS |
| `lg-pocketbase` | base de données | **aucune** — réseau Docker interne uniquement |

Contrairement à Gringotts, PocketBase n'est pas proxifié : ni `/api/`, ni `/_/`.
C'est le serveur Node qui décide quel joueur voit quelle carte, donc ouvrir
l'API de la base reviendrait à publier tous les rôles de toutes les parties.
Les collections n'ont d'ailleurs aucune règle d'accès : elles ne répondent
qu'au compte de service.

## Première installation

```bash
cd /srv                     # ou l'emplacement habituel des projets
git clone git@github.com:Simondbf/loup-garou.git lg
cd lg

cp .env.example .env
openssl rand -base64 30     # coller le résultat dans POCKETBASE_ADMIN_PASSWORD
nano .env

docker compose up -d --build
docker compose logs -f app  # attendre « Listening on: http://localhost:3000 »
```

Vérification avant de brancher nginx :

```bash
curl -I http://127.0.0.1:3005/          # doit répondre 200
```

Puis nginx et le certificat :

```bash
sudo cp deploiement/lg.soleiljaune.be.conf /etc/nginx/sites-available/
sudo certbot certonly --nginx -d lg.soleiljaune.be
sudo ln -s /etc/nginx/sites-available/lg.soleiljaune.be /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Les zones DNS A et AAAA sont déjà en place chez Infomaniak.

**Si le port 3005 est déjà pris** par un autre projet, changer la ligne
`ports:` du `docker-compose.yml` *et* les deux `proxy_pass` du fichier nginx.
Pour vérifier : `ss -ltnp | grep 300`.

## Mise à jour

```bash
cd /srv/lg
git pull
docker compose up -d --build
```

Le schéma PocketBase se met à jour tout seul : les fichiers de `pb_migrations/`
non encore appliqués sont joués au démarrage du conteneur.

## Sauvegarde

Toutes les données vivent dans `./pb_data`. Une partie terminée n'a aucune
valeur au-delà de la soirée, donc une sauvegarde quotidienne suffit largement :

```bash
docker compose stop pocketbase
tar czf ~/sauvegardes/lg-$(date +%F).tar.gz pb_data
docker compose start pocketbase
```

## Ménage des vieilles parties

Rien ne purge la base pour l'instant : chaque partie créée y reste
indéfiniment. Ce n'est pas urgent (quelques kilo-octets par partie), mais
c'est à prévoir — soit un `cron` qui supprime les parties de plus de sept
jours, soit une purge automatique côté serveur.

## Dépannage

**« PocketBase : authentification refusée (400) »**
Le mot de passe du `.env` ne correspond pas au compte créé au tout premier
démarrage. La migration ne rejoue pas : il faut corriger le compte
directement.

```bash
docker compose exec pocketbase /usr/local/bin/pocketbase \
  superuser update lg@soleiljaune.be 'le-mot-de-passe-du-.env'
```

**Repartir de zéro** (efface toutes les parties) :

```bash
docker compose down
sudo rm -rf pb_data
docker compose up -d
```

**Voir les journaux**

```bash
docker compose logs -f app
docker compose logs -f pocketbase
```

## Note sur les deux fichiers de verrouillage

Le dépôt contient `bun.lock` (utilisé par Lovable) et `package-lock.json`
(utilisé par le `Dockerfile`). Les deux décrivent les mêmes dépendances mais
peuvent diverger avec le temps. Si tu abandonnes l'éditeur Lovable pour ce
projet, supprime `bun.lock` et `bunfig.toml`.
