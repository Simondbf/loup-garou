/// <reference path="../pb_data/types.d.ts" />

/**
 * Le journal de la journée en cours.
 *
 * Pendant longtemps, le jour n'a rien eu à retenir : les morts prennent
 * effet aussitôt et tout se passe à voix haute. Le moteur de jour change
 * cela — il faut savoir où en est le fil, ce qu'a donné le vote, et ce que
 * la nuit a laissé à annoncer au matin. D'où ce champ, jumeau de `nuit`,
 * lisible du seul Maître du Jeu.
 *
 * Migration séparée de l'initiale : celle-ci ne rejoue pas sur une base
 * déjà en service.
 */

migrate(
  (app) => {
    const games = app.findCollectionByNameOrId("games");
    games.fields.add(
      new JSONField({
        name: "jour",
        maxSize: 100000,
      }),
    );
    app.save(games);
  },
  (app) => {
    const games = app.findCollectionByNameOrId("games");
    const champ = games.fields.getByName("jour");
    if (champ) {
      games.fields.removeById(champ.id);
      app.save(games);
    }
  },
);
