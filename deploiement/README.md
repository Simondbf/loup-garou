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

Tout se fait en SSH sur le VPS. **Fais les étapes une par une** : chacune se
vérifie avant de passer à la suivante. Lancer tout le bloc d'un coup masque
l'endroit où ça casse.

### 1. Choisir un port libre

```bash
for p in 3010 3011 3012 3013 3014; do ss -ltn | grep -q ":$p " || { echo "PORT LIBRE : $p"; break; }; done
```

Note le port affiché. Le dépôt est réglé sur **3010** ; si la commande en
propose un autre, remplace `3010` par celui-là dans deux fichiers après
l'étape 2 : la ligne `ports:` de `docker-compose.yml`, et les `proxy_pass`
des fichiers de `deploiement/`.

### 2. Récupérer le projet

Le dépôt est privé : le clonage en HTTPS échoue avec « Write access to
repository not granted ». Il faut passer par SSH.

```bash
ls ~/.ssh/id_*.pub          # une clé existe-t-elle ?
ssh -T git@github.com       # doit répondre « Hi Simondbf! »
```

Si `ssh -T` échoue, crée une clé et ajoute-la sur GitHub
(Settings → SSH and GPG keys) :

```bash
ssh-keygen -t ed25519 -C "vps-hetzner"
cat ~/.ssh/id_ed25519.pub
```

Puis :

```bash
cd /srv
git clone git@github.com:Simondbf/loup-garou.git lg
cd lg
pwd                          # doit afficher /srv/lg
```

**Ne continue pas tant que `pwd` n'affiche pas `/srv/lg`.** Toutes les
commandes suivantes supposent que tu es dans ce dossier.

### 3. Créer le fichier de secrets

```bash
openssl rand -base64 30
```

Copie le résultat, puis :

```bash
cp .env.example .env
nano .env
```

Colle le mot de passe après `POCKETBASE_ADMIN_PASSWORD=`, sans guillemets ni
espace. `Ctrl+O`, `Entrée`, `Ctrl+X`.

Garde une copie du mot de passe dans ton gestionnaire : il sert à ouvrir le
tableau de bord PocketBase si tu en as besoin un jour.

### 4. Démarrer les conteneurs

```bash
docker compose up -d --build
docker compose ps
```

La première construction prend deux à trois minutes. Les deux lignes
`lg-app` et `lg-pocketbase` doivent afficher `Up`.

### 5. Vérifier que l'application répond

```bash
curl -I http://127.0.0.1:3010/
```

Il faut lire `HTTP/1.1 200 OK` **et** `x-powered-by` absent d'un autre
serveur. Si tu vois `server: uvicorn` ou tout autre serveur, c'est qu'un
autre projet occupe ce port : reprends à l'étape 1.

Si ce n'est pas 200 : `docker compose logs app`. Inutile de toucher à nginx
tant que cette étape échoue.

### 6. Installer la configuration nginx temporaire

Certbot ne sait pas valider un domaine que nginx ignore : il répond 404 au
défi et la demande échoue. On installe donc d'abord une configuration sans
TLS.

```bash
sudo mkdir -p /var/www/certbot
sudo cp deploiement/lg.soleiljaune.be.etape1-http.conf \
        /etc/nginx/sites-available/lg.soleiljaune.be
sudo ln -sf /etc/nginx/sites-available/lg.soleiljaune.be \
            /etc/nginx/sites-enabled/lg.soleiljaune.be
sudo nginx -t && sudo systemctl reload nginx
```

Vérifie depuis l'extérieur, en HTTP simple :

```bash
curl -I http://lg.soleiljaune.be/
```

Un `200` confirme que le DNS pointe bien ici et que nginx transmet à
l'application. Si tu obtiens un 404 ou une autre page, le certificat
échouera aussi : règle-le maintenant.

### 7. Obtenir le certificat

```bash
sudo certbot certonly --webroot -w /var/www/certbot -d lg.soleiljaune.be
```

Le message attendu se termine par `Successfully received certificate`.

Note : ton domaine a un enregistrement AAAA (IPv6). Let's Encrypt valide en
priorité par IPv6 — c'est ce qui a échoué la première fois. Vérifie que les
deux adresses répondent :

```bash
curl -4 -I http://lg.soleiljaune.be/
curl -6 -I http://lg.soleiljaune.be/
```

### 8. Passer en HTTPS

```bash
sudo cp deploiement/lg.soleiljaune.be.etape2-https.conf \
        /etc/nginx/sites-available/lg.soleiljaune.be
sudo nginx -t
```

`nginx -t` doit répondre `syntax is ok` et `test is successful`. Alors
seulement :

```bash
sudo systemctl reload nginx
```

### 9. Vérifier depuis un navigateur

Ouvre `https://lg.soleiljaune.be`. Tu dois voir la lune et « Thiercelieux ».
Crée une partie de test à 7 joueurs pour confirmer que la base répond.

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
