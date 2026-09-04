/// <reference path="../pb_data/types.d.ts" />

/**
 * Flèche vers la partie qui prend la suite.
 *
 * Quand le Maître du Jeu relance avec les mêmes joueurs, l'ancienne partie
 * garde le code de la nouvelle. Chaque téléphone la suit tout seul au
 * rafraîchissement suivant : personne n'a de code à retaper.
 */

migrate(
  (app) => {
    const games = app.findCollectionByNameOrId("games");
    games.fields.add(
      new TextField({
        name: "suite",
        max: 8,
      }),
    );
    app.save(games);
  },
  (app) => {
    const games = app.findCollectionByNameOrId("games");
    const champ = games.fields.getByName("suite");
    if (champ) {
      games.fields.removeById(champ.id);
      app.save(games);
    }
  },
);
