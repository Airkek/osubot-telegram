import Database from "./Database";
import { BeatmapStatus } from "../Types";

export interface IMigration {
    version: number;
    name: string;
    process: (db: Database) => Promise<boolean>;
}

const migrations: IMigration[] = [
    {
        version: 1,
        name: "Create tables",
        process: async (db: Database) => {
            await db.run("CREATE TABLE IF NOT EXISTS covers (id BIGINT, attachment TEXT)");
            await db.run("CREATE TABLE IF NOT EXISTS photos (url TEXT, attachment TEXT)");
            await db.run("CREATE TABLE IF NOT EXISTS errors (code TEXT, info TEXT, error TEXT)");
            await db.run("CREATE TABLE IF NOT EXISTS users_to_chat (user_id BIGINT, chat_id TEXT)");
            await db.run(
                "CREATE TABLE IF NOT EXISTS users (id BIGINT, game_id TEXT, nickname TEXT, mode SMALLINT, server TEXT)"
            );
            await db.run(
                "CREATE TABLE IF NOT EXISTS stats (id TEXT, nickname TEXT, server TEXT, mode SMALLINT, pp REAL DEFAULT 0, rank INTEGER DEFAULT 9999999, acc REAL DEFAULT 100)"
            );
            return true;
        },
    },
    {
        version: 2,
        name: "Create ignore list table",
        process: async (db: Database) => {
            await db.run("CREATE TABLE IF NOT EXISTS ignored_users (id BIGINT)");
            return true;
        },
    },
    {
        version: 3,
        name: "Remove all cached covers (migrate from raw to cover@2x)",
        process: async (db: Database) => {
            await db.run("DELETE FROM covers");
            return true;
        },
    },
    {
        version: 4,
        name: "Create osu! beatmap metadata cache table",
        process: async (db: Database) => {
            await db.run(
                `CREATE TABLE IF NOT EXISTS osu_beatmap_metadata
                 (
                     id            BIGINT,
                     set_id        BIGINT,
                     hash          TEXT,

                     title         TEXT,
                     artist        TEXT,

                     version       TEXT,
                     author        TEXT,
                     status        TEXT,

                     native_mode   SMALLINT,
                     native_length BIGINT
                 )`
            );
            return true;
        },
    },
    {
        version: 5,
        name: "Create settings table",
        process: async (db: Database) => {
            await db.run(
                `CREATE TABLE IF NOT EXISTS settings
                 (
                     user_id          BIGINT UNIQUE NOT NULL,
                     render_enabled   BOOLEAN  DEFAULT true,
                     ordr_skin        BIGINT   DEFAULT 60,
                     ordr_video       BOOLEAN  DEFAULT true,
                     ordr_storyboard  BOOLEAN  DEFAULT true,
                     ordr_bgdim       SMALLINT DEFAULT 75,
                     ordr_pp_counter  BOOLEAN  default true,
                     ordr_ur_counter  BOOLEAN  default true,
                     ordr_hit_counter BOOLEAN  default true
                 )`
            );
            return true;
        },
    },
    {
        version: 6,
        name: "Add ordr_strain_graph to settings",
        process: async (db: Database) => {
            await db.run(
                `ALTER TABLE settings
                    ADD COLUMN ordr_strain_graph BOOLEAN DEFAULT true`
            );
            return true;
        },
    },
    {
        version: 7,
        name: "Change ordr_skin type to TEXT",
        process: async (db: Database) => {
            await db.run(`ALTER TABLE settings
                RENAME TO temp_settings`);

            await db.run(`
                CREATE TABLE settings
                (
                    user_id           BIGINT UNIQUE NOT NULL,
                    render_enabled    BOOLEAN  DEFAULT true,
                    ordr_skin         TEXT     DEFAULT 'whitecatCK1.0',
                    ordr_video        BOOLEAN  DEFAULT true,
                    ordr_storyboard   BOOLEAN  DEFAULT true,
                    ordr_bgdim        SMALLINT DEFAULT 75,
                    ordr_pp_counter   BOOLEAN  DEFAULT true,
                    ordr_ur_counter   BOOLEAN  DEFAULT true,
                    ordr_hit_counter  BOOLEAN  DEFAULT true,
                    ordr_strain_graph BOOLEAN  DEFAULT true
                )
            `);

            await db.run(`
                INSERT INTO settings
                SELECT user_id,
                       render_enabled,
                       CAST(ordr_skin AS TEXT),
                       ordr_video,
                       ordr_storyboard,
                       ordr_bgdim,
                       ordr_pp_counter,
                       ordr_ur_counter,
                       ordr_hit_counter,
                       ordr_strain_graph
                FROM temp_settings
            `);

            await db.run(`DROP TABLE temp_settings`);

            return true;
        },
    },
    {
        version: 8,
        name: "Add ability to set custom o!rdr skin",
        process: async (db: Database) => {
            await db.run(
                `ALTER TABLE settings
                    ADD COLUMN ordr_is_skin_custom BOOLEAN DEFAULT false`
            );
            return true;
        },
    },
    {
        version: 9,
        name: "Create chat_settings table",
        process: async (db: Database) => {
            await db.run(
                `CREATE TABLE IF NOT EXISTS chat_settings
                 (
                     chat_id        BIGINT UNIQUE NOT NULL,
                     render_enabled BOOLEAN DEFAULT true
                 )`
            );
            return true;
        },
    },
    {
        version: 10,
        name: "Remove Qualified maps from cache",
        process: async (db: Database) => {
            await db.run(
                `DELETE
                          FROM osu_beatmap_metadata
                          WHERE status = $1`,
                [BeatmapStatus[BeatmapStatus.Qualified]]
            );
            return true;
        },
    },
    {
        version: 11,
        name: "Add notifications_enabled to settings",
        process: async (db: Database) => {
            await db.run(
                `ALTER TABLE chat_settings
                    ADD COLUMN notifications_enabled BOOLEAN DEFAULT true`
            );
            await db.run(
                `ALTER TABLE settings
                    ADD COLUMN notifications_enabled BOOLEAN DEFAULT true`
            );
            return true;
        },
    },
    {
        version: 12,
        name: "Add experimental_renderer to settings",
        process: async (db: Database) => {
            await db.run(
                `ALTER TABLE settings
                    ADD COLUMN experimental_renderer BOOLEAN DEFAULT false`
            );
            return true;
        },
    },
    {
        version: 13,
        name: "Add language_override to settings",
        process: async (db: Database) => {
            await db.run(
                `ALTER TABLE chat_settings
                    ADD COLUMN language_override TEXT DEFAULT 'do_not_override'`
            );
            await db.run(
                `ALTER TABLE settings
                    ADD COLUMN language_override TEXT DEFAULT 'do_not_override'`
            );
            return true;
        },
    },
    {
        version: 14,
        name: "Add render volume settings",
        process: async (db: Database) => {
            await db.run(
                `ALTER TABLE settings
                    ADD COLUMN ordr_music_volume SMALLINT DEFAULT 50`
            );
            await db.run(
                `ALTER TABLE settings
                    ADD COLUMN ordr_effects_volume SMALLINT DEFAULT 50`
            );
            await db.run(
                `ALTER TABLE settings
                    ADD COLUMN ordr_master_volume SMALLINT DEFAULT 50`
            );
            return true;
        },
    },
    {
        version: 15,
        name: "Add content output type settings",
        process: async (db: Database) => {
            await db.run(
                `ALTER TABLE settings
                    ADD COLUMN content_output TEXT DEFAULT 'oki-cards'`
            );
            await db.run(`UPDATE settings
                          SET content_output = 'legacy-text'`);
            return true;
        },
    },
    {
        version: 16,
        name: "Add feature control",
        process: async (db: Database) => {
            await db.run(
                `CREATE TABLE IF NOT EXISTS feature_control
                 (
                     feature         TEXT UNIQUE NOT NULL,
                     enabled_for_all BOOLEAN DEFAULT false
                 )`
            );

            await db.run(`INSERT INTO feature_control (feature, enabled_for_all)
                          VALUES ('oki-cards', false)`);
            return true;
        },
    },
    {
        version: 17,
        name: "Add feature 'plaintext-overrides'",
        process: async (db: Database) => {
            await db.run(
                `INSERT INTO feature_control (feature, enabled_for_all)
                 VALUES ('plaintext-overrides', false)`
            );
            return true;
        },
    },
    {
        version: 18,
        name: "Add cover url to beatmap cache",
        process: async (db: Database) => {
            await db.run(
                `ALTER TABLE osu_beatmap_metadata
                    ADD COLUMN cover_url TEXT`
            );

            await db.run(
                `UPDATE osu_beatmap_metadata
                 SET cover_url = 'https://assets.ppy.sh/beatmaps/' || set_id || '/covers/cover@2x.jpg'`
            );

            return true;
        },
    },
    {
        version: 19,
        name: "Add author_id to beatmap cache",
        process: async (db: Database) => {
            await db.run(
                `ALTER TABLE osu_beatmap_metadata
                    ADD COLUMN author_id BIGINT`
            );

            // invalidate cache
            await db.run(`DELETE
                          FROM osu_beatmap_metadata`);

            return true;
        },
    },
    {
        version: 20,
        name: "Force enable oki-cards for all",
        process: async (db: Database) => {
            await db.run("UPDATE settings SET content_output = 'oki-cards'");
            return true;
        },
    },
    {
        version: 21,
        name: "Create 'statistics' table",
        process: async (db: Database) => {
            await db.run("CREATE EXTENSION IF NOT EXISTS timescaledb");

            await db.run(`CREATE TABLE bot_events
                          (
                              time       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                              event_type TEXT        NOT NULL,
                              user_id    BIGINT,
                              chat_id    BIGINT,
                              event_data JSONB
                          );`);

            await db.run("SELECT create_hypertable('bot_events', 'time')");
            await db.run("CREATE INDEX idx_event_type ON bot_events (event_type)");
            await db.run("CREATE INDEX idx_user_id ON bot_events (user_id)");
            return true;
        },
    },
];

export async function applyMigrations(db: Database) {
    global.logger.info("Applying migrations");
    const applied = new Set<number>();
    const dbData: IMigration[] = await db.all("SELECT version FROM migrations");
    for (const m of dbData) {
        applied.add(m.version);
    }

    for (const migration of migrations) {
        if (applied.has(migration.version)) {
            continue;
        }

        global.logger.info(`Processing migration #${migration.version}: ${migration.name}`);

        let res = false;
        try {
            res = await migration.process(db);
        } catch (e) {
            global.logger.error(e);
        }

        if (res) {
            global.logger.info("Success");
            await db.run("INSERT INTO migrations (version) VALUES ($1)", [migration.version]);
        } else {
            global.logger.fatal("Failed. Aborting");
            process.abort();
        }
    }
}
