/// <reference path="../pb_data/types.d.ts" />

/**
 * Les trois cartes du Comédien.
 *
 * Le Comédien choisit chaque nuit parmi trois cartes de villageois posées
 * face visible au centre de la table. Elles sont donc connues de tous, au
 * même titre que le Villageois-Villageois : ce champ est exposé à tous les
 * joueurs, pas seulement au Maître du Jeu.
 *
 * Migration séparée de l'initiale : celle-ci ne rejoue pas sur une base
 * déjà en service.
 */

migrate(
  (app) => {
    const games = app.findCollectionByNameOrId("games");
    games.fields.add(
      new JSONField({
        name: "comedien_cartes",
        maxSize: 10000,
      }),
    );
    app.save(games);
  },
  (app) => {
    const games = app.findCollectionByNameOrId("games");
    const champ = games.fields.getByName("comedien_cartes");
    if (champ) {
      games.fields.removeById(champ.id);
      app.save(games);
    }
  },
);
