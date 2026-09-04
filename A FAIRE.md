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

## Moteur de partie — avancement
1. **Nuit pas à pas** — fait. Un écran par étape, profils cliquables, retour arrière.
2. **Jour pas à pas** — fait. `src/components/conduite-jour.tsx` : annonces, cartes
   retournées, débat, vote, et les déclencheurs qui s'accumulent.
3. **États visibles côté joueur** — fait. Chaque téléphone reçoit l'état de ses
   seules places (`mesEtats`). Volontairement absents : l'identité de l'aimé, le
   charme du Flûtiste, la liste des envoûtés. Seule exception voulue : le passage
   côté Loups, qui est une consigne de jeu.
4. **Salon multi-téléphones** — fait, en deux temps. `lobby` : le MJ donne le
   code, chaque joueur entre son prénom sur son téléphone et voit le village se
   remplir en direct. `composition` : le MJ valide les profils, l'effectif est
   déduit du nombre de profils et il choisit les cartes. Un retardataire peut
   encore rejoindre pendant ce second temps — le compte suit, il n'y a qu'une
   carte de plus à poser. Le MJ ne prête pas son téléphone, n'inscrit personne
   et ne range pas les joueurs en cercle.
5. **Fin de partie** — fait. « Terminer la partie » ouvre aussitôt la suivante :
   mêmes places, mêmes prénoms, mêmes téléphones, nouveau code tiré tout seul.
   L'ancienne partie garde une flèche (`suite`) et chaque appareil la suit sans
   rien retaper. Le MJ reste le MJ ; pour en changer, on se passe le téléphone,
   d'où les prénoms de nouveau modifiables.

## Ordre d'une journée
1. Lever du jour : les morts de la nuit, puis la carte de chacun.
2. Ce que ces morts déclenchent, tout de suite : la balle du Chasseur dévoré,
   la succession de l'écharpe, la gangrène du Chevalier — avec la carte et les
   déclenchements de chaque nouvelle victime, en boucle.
3. Envoûtés du Flûtiste, grognement de l'Ours.
4. Élection du Capitaine, si la table y joue et que l'écharpe est vacante.
5. Débat, puis vote.
6. Égalité : le Bouc Émissaire, sinon la voix du Capitaine, sinon personne.
7. Carte du condamné, puis la même boucle de déclenchements.
8. Second vote du Juge Bègue, le cas échéant.
9. Clôture : la nuit tombe.

Le Capitaine est une option de partie (`hostState.avecCapitaine`, cochée par
défaut dans l'écran de composition). Décochée : ni élection, ni succession, ni
voix double, et une égalité ne fait aucune victime.

## Fin de partie
`vainqueur()` recalcule le gagnant à chaque envoi d'état — c'est une propriété
de la table, pas un événement à retenir. Ordre : l'Ange noté par la conduite,
les Amoureux de camps opposés derniers en lice, le Joueur de Flûte quand tous
les survivants sont envoûtés, le Loup-Garou Blanc dernier debout, la meute
quand il ne reste qu'elle, le village quand il n'y a plus ni Loup ni solitaire.

L'annonce ne coupe jamais un enchaînement : le fil du jour garde les cartes à
retourner et les pouvoirs à déclencher, et ne place l'écran de victoire qu'au
bout. C'est ce qui laisse la balle d'un Chasseur renverser une partie déjà
gagnée. Les téléphones des joueurs affichent la même phrase et toutes les
cartes se retournent.

Pas encore traité : l'Abominable Sectaire, dont la victoire dépend d'un
découpage de la table que l'application ne connaît pas.

## Ce que le MJ n'a plus
- Pas d'onglet Joueurs : les profils sont cliquables dans le déroulé.
- Pas de rangement en cercle (`moveSeat` supprimé).
- L'onglet « Montrer » n'existe qu'en mode un seul téléphone, sans destinataire
  ni historique : la carte s'affiche sur son écran, il tourne le téléphone.

## À faire
- Nom définitif de l'app (« Les Nuits de Thiercelieux » retenu (titre de roman, distinct du jeu de société)).
- Emballage Android (Capacitor / TWA) et fiche Play Store ; sous-domaine prévu : lg.soleiljaune.be.
- Vérification juridique : ne pas utiliser noms d'extensions, visuels ni logos officiels ; rester sur du texte et des rôles génériques.
- Temps réel : passer du sondage toutes les 3 s à un canal temps réel si besoin.
- Historique des parties, minuteur de débat, ambiance sonore.
