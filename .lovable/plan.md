# Les Nuits de Thiercelieux — simplification de l'interface

## 1. Titre
- Retour au nom « Les Nuits de Thiercelieux » partout (accueil, titres de pages, métadonnées, README, A FAIRE).
- Note : ce nom est celui de la boîte officielle. Pour un usage privé/web c'est sans conséquence pratique, mais pour une publication Play Store il faudra prévoir un nom neutre. Rien n'est bloqué aujourd'hui.

## 2. Écran d'accueil épuré
Ne restent que :
- le titre + la phrase d'explication actuelle,
- « Créer une partie (Maître du Jeu) »,
- « Rejoindre avec un code ».

Les quatre tuiles (Cartes, Compositions, Règles, Téléphone partagé) disparaissent. À la place, un bouton menu (☰) en haut à droite, présent sur toutes les pages, donnant accès à : Les cartes, Compositions, Règles.

## 3. Création de partie (Maître du Jeu)
Parcours en 3 temps, plus direct :
1. **Nombre de joueurs** — plus de plafond à 24 (jusqu'à 40), minimum 7. Sous le compteur, une bascule **« Un seul téléphone pour tout le monde »** (oui/non). Si oui : pas de code à partager, toutes les places sont portées par le téléphone du MJ et la partie passe directement en mode « on fait tourner l'appareil ». Si non : le MJ garde son téléphone pour lui seul, les places libres restantes peuvent quand même être portées par un autre appareil.
2. **Composition** — écran unique façon Undercover : la composition conseillée pour ce nombre de joueurs est **pré-remplie** et immédiatement modifiable (+ / − par rôle) dans la même vue. S'il n'existe pas de préréglage (17, 25+…), on part d'une base automatique (loups ≈ 1/4 des joueurs, Voyante, Sorcière, Cupidon, Chasseur, le reste en Villageois) toujours modifiable. Un sélecteur discret en haut permet de changer de préréglage. Plus d'étape « liste des compositions » séparée.
3. **Validation** → code de partie (ou démarrage direct en mode un seul téléphone).

## 4. Prénom + carte (comme Undercover)
Sur l'écran de distribution : le joueur saisit son prénom, appuie, la carte se retourne et affiche le nom du rôle **avec une bulle explicative courte** (camp, ce qu'il fait la nuit, sa spécificité). Nouvel appui : la carte se recache et on passe au joueur suivant. Même comportement que le téléphone soit partagé ou individuel.

## 5. Tableau de bord du Maître du Jeu
- **Liste nom + rôle** de chaque joueur, visible en permanence (aujourd'hui le rôle n'est affiché que par un pictogramme) : « Camille — Sorcière », avec son camp.
- Indication claire du mode : « Un seul téléphone » ou « X/Y places connectées » avec le code.
- En mode un seul téléphone, l'écran de partage du code est remplacé par un simple « Commencer la distribution ».

## 6. Bâillon du Garde Champêtre
Préciser partout (règles, écran MJ, carte du joueur) que le joueur bâillonné **peut communiquer par gestes**, mais pas parler ; il vote normalement.

## Détails techniques
- Menu : nouveau composant `AppMenu` monté dans `src/routes/__root.tsx` ; routes `/roles`, `/compositions`, `/regles` conservées.
- `src/routes/nouvelle-partie.tsx` : fusion des étapes 2 et 3, pré-remplissage via `COMPOSITIONS` + génération de secours, `MAX` porté à 40, ajout de l'option `singleDevice`.
- Backend : ajout d'une colonne `single_device` sur `games` (migration + GRANT), prise en compte dans `createGame` et dans le DTO ; en mode un seul téléphone, `createGame` attribue toutes les places au jeton du MJ.
- `src/routes/maitre.tsx` : ligne joueur enrichie (nom + rôle + camp), en-tête adapté au mode.
- `src/routes/distribution.tsx` : bulle explicative sur la carte révélée.
- Textes du bâillon : `src/routes/regles.tsx`, `src/data/roles.ts`, écran MJ.
