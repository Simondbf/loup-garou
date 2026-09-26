/// <reference path="../pb_data/types.d.ts" />

/**
 * Schéma initial des Nuits de Thiercelieux.
 *
 * PocketBase applique automatiquement les migrations non encore jouées au
 * démarrage (`serve`). Ce fichier crée le compte superuser utilisé par le
 * serveur Node, puis les trois collections de la partie.
 *
 * Aucune collection n'a de règle d'accès (listRule, viewRule… restent nulles) :
 * elles ne sont donc lisibles et modifiables que par un superuser. C'est
 * l'équivalent d'une politique « tout refuser » côté base.
 */

migrate(
  (app) => {
    /* ---------------- Compte de service ---------------- */

    const email = $os.getenv("POCKETBASE_ADMIN_EMAIL");
    const password = $os.getenv("POCKETBASE_ADMIN_PASSWORD");

    if (email && password) {
      let existe = true;
      try {
        app.findAuthRecordByEmail("_superusers", email);
      } catch {
        existe = false;
      }
      if (!existe) {
        const superusers = app.findCollectionByNameOrId("_superusers");
        const compte = new Record(superusers);
        compte.set("email", email);
        compte.set("password", password);
        app.save(compte);
      }
    }

    /* ---------------- games ---------------- */

    const games = new Collection({
      type: "base",
      name: "games",
      fields: [
        { type: "text", name: "code", required: true, min: 4, max: 4 },
        { type: "text", name: "host_token", required: true, max: 64 },
        { type: "text", name: "status", required: true, max: 16 },
        { type: "text", name: "phase", required: true, max: 16 },
        { type: "number", name: "night", onlyInt: true },
        { type: "number", name: "player_count", onlyInt: true },
        { type: "bool", name: "single_device" },
        { type: "text", name: "thief_variant", max: 16 },
        { type: "json", name: "selection", maxSize: 100000 },
        { type: "json", name: "center_cards", maxSize: 100000 },
        { type: "json", name: "gag_history", maxSize: 100000 },
        { type: "json", name: "host_state", maxSize: 100000 },
        { type: "json", name: "nuit", maxSize: 100000 },
        { type: "autodate", name: "created", onCreate: true, onUpdate: false },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_lg_games_code ON games (code)",
        "CREATE INDEX idx_lg_games_updated ON games (updated)",
      ],
    });
    app.save(games);

    const gamesId = app.findCollectionByNameOrId("games").id;

    /* ---------------- seats ---------------- */

    const seats = new Collection({
      type: "base",
      name: "seats",
      fields: [
        {
          type: "relation",
          name: "game_id",
          required: true,
          collectionId: gamesId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { type: "number", name: "position", required: true, onlyInt: true },
        { type: "text", name: "name", max: 24 },
        { type: "text", name: "role_id", max: 40 },
        { type: "bool", name: "alive" },
        { type: "text", name: "death_cause", max: 32 },
        { type: "text", name: "death_phase", max: 8 },
        { type: "text", name: "death_phase", max: 8 },
        { type: "number", name: "death_order", onlyInt: true },
        { type: "bool", name: "is_captain" },
        { type: "number", name: "lover_group", onlyInt: true },
        { type: "json", name: "statuses", maxSize: 10000 },
        { type: "bool", name: "public_role" },
        { type: "text", name: "device_token", max: 64 },
        { type: "bool", name: "seen" },
        { type: "autodate", name: "created", onCreate: true, onUpdate: false },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_lg_seats_game_position ON seats (game_id, position)",
        "CREATE INDEX idx_lg_seats_game ON seats (game_id)",
      ],
    });
    app.save(seats);

    /* ---------------- reveals ---------------- */

    const reveals = new Collection({
      type: "base",
      name: "reveals",
      fields: [
        {
          type: "relation",
          name: "game_id",
          required: true,
          collectionId: gamesId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { type: "number", name: "target_position", required: true, onlyInt: true },
        { type: "number", name: "to_position", required: true, onlyInt: true },
        { type: "text", name: "note", max: 64 },
        { type: "autodate", name: "created", onCreate: true, onUpdate: false },
      ],
      indexes: ["CREATE INDEX idx_lg_reveals_game ON reveals (game_id)"],
    });
    app.save(reveals);
  },

  (app) => {
    for (const nom of ["reveals", "seats", "games"]) {
      try {
        app.delete(app.findCollectionByNameOrId(nom));
      } catch {
        /* déjà supprimée */
      }
    }
  },
);
