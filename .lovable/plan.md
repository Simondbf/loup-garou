# Reprise complète : ménage, cartes sobres, et parties multi-téléphones

Trois lots, dans l'ordre. Le lot 1 et 2 sont rapides, le lot 3 est le gros morceau (le code de partie n'existe pas encore : aujourd'hui tout est local à un seul téléphone).

## Lot 1 — Ménage

- Suppression des 47 illustrations générées et du fichier qui les charge.
- Nouvelles cartes sans image : uniquement le **nom du rôle** sur un fond typé camp.
  - Village : fond clair, texte sombre.
  - Loups : fond sombre, texte clair.
  - Ambigu et solitaire : carte coupée en diagonale, moitié claire / moitié sombre, nom centré lisible sur les deux moitiés.
- Suppression de la catégorie « Rôles bonus & maison » et de ses rôles inventés :
  - Le Médium : supprimé.
  - Le Voleur d'Identité (V2) : supprimé en tant que carte ; il devient une **variante du Voleur** (même carte, option activable à la création de partie).
  - Le Garde Champêtre : conservé, reclassé dans une extension existante.
- Création d'un fichier `A FAIRE` à la racine du dépôt listant les points en attente (variante Voleur V2, illustrations futures, publication Play Store, etc.).

## Lot 2 — Garde Champêtre revu

- Il agit **en toute fin de nuit** (dernier de l'ordre de réveil, après tous les autres rôles).
- Il désigne au MJ un joueur qui **ne pourra pas parler** pendant le débat du lendemain.
- Le joueur bâillonné **peut toujours voter**.
- Il ne peut pas re-désigner un joueur déjà bâillonné : une cible redevient sélectionnable seulement après 3 nuits.
- L'écran MJ enregistre la cible, affiche le bâillon dans la liste des joueurs le jour suivant, et grise automatiquement les cibles interdites. Si la cible meurt, le bâillon disparaît simplement.

## Lot 3 — Parties multi-téléphones (code de partie)

C'est ce qui manque le plus par rapport à tes demandes. Objectif : les trois configurations fonctionnent avec le même flux.

1. **Un seul téléphone qui tourne** (façon Undercover) — comme aujourd'hui.
2. **Un téléphone par joueur** — chacun rejoint avec le code.
3. **Mixte** — certains appareils portent 2, 3 ou 4 joueurs, d'autres un seul.

Déroulé retenu :

```text
MJ : "Nouvelle partie" -> choisit le nombre de joueurs
     -> propositions de composition (ajustables carte par carte)
     -> l'app génère un CODE à 4 lettres, affiché en grand
Joueurs : "Rejoindre" -> code -> "combien de joueurs sur ce téléphone ?"
     -> chacun prend une place libre, saisit son prénom
MJ : voit le remplissage en direct, lance la distribution quand tout est prêt
Joueurs : tapent leur carte -> nom + description -> re-tap pour refermer
```

- Places non réclamées : le MJ peut les basculer sur son propre téléphone (mode « passe le téléphone ») pour les joueurs sans smartphone. Aucun joueur ne reste bloqué.
- Le MJ a toujours un téléphone pour lui seul et ne reçoit pas de carte.
- Reconnexion : si un joueur ferme l'app, il retrouve ses places grâce à un jeton stocké sur l'appareil.
- Minimum 7 joueurs.
- L'onglet MJ disparaît de l'accueil : c'est la création de partie qui donne le rôle de MJ.

### Écran Maître du Jeu

- Liste de tous les joueurs avec leur rôle, masquable d'un geste.
- Marquer un mort avec sa cause (loups, vote, potion, chasseur…) : cascade automatique des amoureux, du chasseur (rappel de tir), de l'Ancien.
- Désigner le Capitaine et le transférer à sa mort.
- Lier les deux amoureux de Cupidon.
- Marquer le Villageois-Villageois comme rôle public : sa carte devient visible de tous.
- Révélations privées : le MJ envoie à la Voyante (ou au Renard, à la Gitane…) le rôle d'un joueur ; l'info apparaît sur le téléphone du joueur concerné, ou s'affiche sur celui du MJ si le joueur n'a pas d'appareil.
- Ordre de réveil de la nuit avec les rôles réellement en jeu, cochable nuit par nuit, Garde Champêtre en dernier.

## Détails techniques

- Base de données déjà en place : `games` (code, statut, nuit, phase, composition), `seats` (position, prénom, rôle, vivant, capitaine, amoureux, statuts, jeton d'appareil), `reveals` (info privée à un joueur).
- Politiques d'accès par code de partie + jeton d'appareil, sans compte utilisateur.
- Synchronisation temps réel sur `seats` et `reveals` pour que les téléphones se mettent à jour sans rafraîchir.
- Le store local actuel devient un adaptateur : même API pour le mode local et le mode en ligne.
