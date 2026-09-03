# À FAIRE — Les Nuits de Thiercelieux (Loup-Garou)

## Fait
- Illustrations générées supprimées ; cartes typographiques (fond clair = village, sombre = loups, diagonale = ambigu/solitaire).
- Rôles « maison » retirés (Médium, Voleur V2 séparé). Le Voleur V2 est désormais une variante du Voleur, choisie à la création de la partie.
- Mentions des extensions officielles retirées (filtrage par camp).
- Garde Champêtre : réveil en toute fin de nuit, bâillon pour le débat du lendemain, vote conservé, même cible impossible avant 3 nuits.
- Multi-appareils : code de partie à 4 lettres, 1 à 6 joueurs par téléphone, places libres portées par le téléphone du MJ.
- MJ : morts + causes, cascade des amoureux, capitaine, rôle rendu public (Villageois-Villageois), ordre de réveil, révélations privées (Voyante, Renard…), phases jour/nuit.

## Audit règles officielles — terminé
Catalogue aligné sur le livret (photos du 3 septembre) : 34 rôles, quatre
catégories du livret (Loups-Garous, Villageois, Ambigus, Solitaires).

Retirés faute de source officielle : Le Sectaire (doublon de l'Abominable
Sectaire), Assassin, Gargouille, Prêtre, Loup Féral, Loup Chamane,
Loup-Garou Noir, Ombre, Mercenaire, Chaman.

Retirés car dépendants des cartes Événement / Spiritisme : Gitane, Garde
Champêtre officiel. À reprendre si un jour on gère ces cartes.

Retirés car dépendants des tuiles Bâtiment : Pyromane (tuile Feu) et
Corbeau (tuile Corbeau). À reprendre en v3 si on gère un jour les
bâtiments du jeu « Le Village ».

## Dépendance Lovable restante
Le build passe encore par `@lovable.dev/vite-tanstack-config`, qui regroupe
les plugins Vite. Si ce paquet disparaît de npm, la construction Docker
casse. Le remplacer par les plugins d'origine (tanstackStart, viteReact,
tailwindcss, tsConfigPaths, nitro) est faisable mais mérite d'être fait à
tête reposée, pas pendant un déploiement.

## Reporté en v3
- Tuiles Bâtiment du jeu « Le Village » : réintroduirait le Pyromane et le
  Corbeau.
- Cartes Événement et Spiritisme de « Nouvelle Lune » : réintroduirait la
  Gitane et le vrai Garde Champêtre, ainsi que les attributions du Capitaine.

## Reporté en v2
- Compositions préenregistrées : rééquilibrage et ajout des tables 13, 16 et
  17 joueurs.
- Renard : le pouvoir perdu sur une réponse « non » se coche à la main dans
  « Pouvoirs à usage unique ». Le calcul automatique des trois voisins reste
  à faire.
- Chasseur : sa balle est rappelée au MJ mais reste à marquer à la main.
- Détection automatique de la fin de partie. Remplacée pour l'instant par le
  cimetière : les joueurs éliminés voient les cartes tombées en direct et
  peuvent constater eux-mêmes que la partie est jouée.
- Option, sur le téléphone d'un joueur éliminé seul (jamais partagé), pour
  suivre les désignations de la nuit en direct.

## À faire
- Nom définitif de l'app (« Les Nuits de Thiercelieux » retenu (titre de roman, distinct du jeu de société)).
- Emballage Android (Capacitor / TWA) et fiche Play Store ; sous-domaine prévu : lg.soleiljaune.be.
- Vérification juridique : ne pas utiliser noms d'extensions, visuels ni logos officiels ; rester sur du texte et des rôles génériques.
- Temps réel : passer du sondage toutes les 3 s à un canal temps réel si besoin.
- Historique des parties, minuteur de débat, ambiance sonore.
