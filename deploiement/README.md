# Déploiement — lg.soleiljaune.be

L'application tourne en deux conteneurs :

| Conteneur | Rôle | Exposition |
|---|---|---|
| `lg-app` | serveur Node (TanStack Start) | `127.0.0.1:3010` sur le VPS |
| `lg-pocketbase` | base de données | **aucune** — réseau Docker interne uniquement |

Contrairement à Gringotts, PocketBase n'est pas proxifié : ni `/api/`, ni `/_/`.
C'est le serveur Node qui décide quel joueur voit quelle carte, donc ouvrir
l'API de la base reviendrait à publier tous les rôles de toutes les parties.
Les collections n'ont d'ailleurs aucune règle d'accès : elles ne répondent
qu'au compte de service.

## Première installation, étape par étape

Tout se fait en SSH sur le VPS Hetzner. Les blocs se copient tels quels.

### 1. Vérifier que le port 3010 est libre

```bash
ss -ltnp | grep :3010
```

Si la commande ne renvoie **rien**, le port est libre : continue.
Si elle renvoie une ligne, choisis un autre port (3011, 3012…) et remplace
`3010` partout aux étapes 5 et 7.

### 2. Récupérer le projet

```bash
cd /srv
git clone https://github.com/Simondbf/loup-garou.git lg
cd lg
```

### 3. Créer le fichier de secrets

Génère un mot de passe :

```bash
openssl rand -base64 30
```

Copie le résultat, puis :

```bash
cp .env.example .env
nano .env
```

Colle le mot de passe après `POCKETBASE_ADMIN_PASSWORD=`, sans guillemets ni
espace. `Ctrl+O`, `Entrée`, `Ctrl+X` pour enregistrer et sortir.

Ce fichier ne part jamais sur GitHub. Garde une copie du mot de passe dans ton
gestionnaire : il sert à ouvrir le tableau de bord PocketBase si un jour tu en
as besoin.

### 4. Démarrer les conteneurs

```bash
docker compose up -d --build
```

La première construction prend deux à trois minutes. Ensuite :

```bash
docker compose ps
```

Les deux lignes `lg-app` et `lg-pocketbase` doivent afficher `Up`
(`healthy` pour PocketBase).

### 5. Vérifier que l'application répond

```bash
curl -I http://127.0.0.1:3010/
```

Il faut lire `HTTP/1.1 200 OK`. Si ce n'est pas le cas, arrête-toi ici et
regarde `docker compose logs app` — inutile de brancher nginx tant que cette
étape échoue.

### 6. Obtenir le certificat

Les zones DNS A et AAAA sont déjà en place chez Infomaniak, donc :

```bash
sudo certbot certonly --nginx -d lg.soleiljaune.be
```

### 7. Brancher nginx

```bash
sudo cp deploiement/lg.soleiljaune.be.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/lg.soleiljaune.be /etc/nginx/sites-enabled/
sudo nginx -t
```

`nginx -t` doit répondre `syntax is ok` et `test is successful`. Alors
seulement :

```bash
sudo systemctl reload nginx
```

### 8. Vérifier depuis l'extérieur

Ouvre `https://lg.soleiljaune.be` dans un navigateur. Tu dois voir la lune et
« Thiercelieux ». Crée une partie de test à 7 joueurs pour confirmer que la
base répond.

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
