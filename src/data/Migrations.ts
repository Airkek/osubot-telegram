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
    {
        version: 22,
        name: "Optimize stats events",
        process: async (db: Database) => {
            await db.run(`CREATE TABLE bot_events_metrics
                          (
                              time       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                              event_type TEXT        NOT NULL,
                              count      INTEGER     NOT NULL
                          )`);
            await db.run("SELECT create_hypertable('bot_events_metrics', 'time')");
            await db.run("CREATE INDEX idx_metrics_event_type ON bot_events_metrics (event_type)");

            await db.run(`CREATE TABLE bot_events_render
                          (
                              time          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                              event_type    TEXT        NOT NULL,
                              user_id       BIGINT,
                              chat_id       BIGINT,
                              experimental  BOOLEAN     NOT NULL,
                              mode          INTEGER     NOT NULL,
                              error_message TEXT
                          )`);
            await db.run("SELECT create_hypertable('bot_events_render', 'time')");
            await db.run("CREATE INDEX idx_render_event_type ON bot_events_render (event_type)");
            await db.run("CREATE INDEX idx_render_is_exp ON bot_events_render (experimental)");

            await db.run(`CREATE TABLE bot_events_commands
                          (
                              time       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                              user_id    BIGINT,
                              chat_id    BIGINT,
                              module     TEXT        NOT NULL,
                              command    TEXT        NOT NULL,
                              text       TEXT,
                              is_payload BOOLEAN     NOT NULL
                          )`);
            await db.run("SELECT create_hypertable('bot_events_commands', 'time')");
            await db.run("CREATE INDEX idx_commands_module ON bot_events_commands (module)");
            await db.run("CREATE INDEX idx_commands_command ON bot_events_commands (command)");
            await db.run("CREATE INDEX idx_commands_payload ON bot_events_commands (is_payload)");

            await db.run(`CREATE TABLE bot_events_startup
                          (
                              time       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                              bot_id     BIGINT,
                              username   TEXT,
                              first_name TEXT,
                              last_name  TEXT
                          )`);
            await db.run("SELECT create_hypertable('bot_events_startup', 'time')");

            // count metrics
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const metrics = await db.all<any>(`SELECT time, event_type, event_data ->> 'count' as count
                                               FROM bot_events
                                               WHERE event_type IN
                                                     ('user_count', 'chat_count', 'cached_beatmap_files_count',
                                                      'cached_beatmap_metadata_count')`);
            for (const row of metrics) {
                await db.run(
                    `INSERT INTO bot_events_metrics (time, event_type, count)
                     VALUES ($1, $2, $3)`,
                    [row.time, row.event_type, row.count]
                );
            }
            await db.run(`DELETE
                          FROM bot_events
                          WHERE event_type IN ('user_count', 'chat_count', 'cached_beatmap_files_count',
                                               'cached_beatmap_metadata_count')`);

            // render_start, render_success, render_failed
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const renders = await db.all<any>(`SELECT time,
                                                      event_type,
                                                      user_id,
                                                      chat_id,
                                                      event_data ->> 'mode'         as mode,
                                                      event_data ->> 'experimental' as experimental,
                                                      event_data ->> 'message'      as message
                                               FROM bot_events
                                               WHERE event_type IN ('render_start', 'render_success', 'render_failed')`);
            for (const row of renders) {
                await db.run(
                    `INSERT INTO bot_events_render (time, event_type, user_id, chat_id, experimental, mode,
                                                    error_message)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [row.time, row.event_type, row.user_id, row.chat_id, row.experimental, row.mode, row.message]
                );
            }
            await db.run(
                "DELETE FROM bot_events WHERE event_type IN ('render_start', 'render_success', 'render_failed')"
            );

            // command_used
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const commands = await db.all<any>(`SELECT time,
                                                       user_id,
                                                       chat_id,
                                                       event_data ->> 'module'     as module,
                                                       event_data ->> 'command'    as command,
                                                       event_data ->> 'text'       as text,
                                                       event_data ->> 'is_payload' as is_payload
                                                FROM bot_events
                                                WHERE event_type = 'command_used'`);
            for (const row of commands) {
                await db.run(
                    `INSERT INTO bot_events_commands (time, user_id, chat_id, module, command, text, is_payload)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [row.time, row.user_id, row.chat_id, row.module, row.command, row.text, row.is_payload]
                );
            }
            await db.run("DELETE FROM bot_events WHERE event_type = 'command_used'");

            // bot_startup
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const startups = await db.all<any>(`SELECT time,
                                                       event_data ->> 'id'         as id,
                                                       event_data ->> 'username'   as username,
                                                       event_data ->> 'first_name' as first_name,
                                                       event_data ->> 'last_name'  as last_name
                                                FROM bot_events
                                                WHERE event_type = 'bot_startup'`);
            for (const row of startups) {
                await db.run(
                    `INSERT INTO bot_events_startup (time, bot_id, username, first_name, last_name)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [row.time, row.id, row.username, row.first_name, row.last_name]
                );
            }
            await db.run("DELETE FROM bot_events WHERE event_type = 'bot_startup'");

            await db.run("ALTER TABLE bot_events DROP COLUMN event_data");

            return true;
        },
    },
    {
        version: 23,
        name: "add 'admin-all-features' feature",
        process: async (db: Database) => {
            await db.run(
                `INSERT INTO feature_control (feature, enabled_for_all)
                 VALUES ('admin-all-features', false)`
            );
            return true;
        },
    },
    {
        version: 24,
        name: "add 'force-onboarding' feature",
        process: async (db: Database) => {
            await db.run(`CREATE TABLE onboarded_users (user_id BIGINT UNIQUE, version INTEGER)`);

            await db.run(
                `INSERT INTO feature_control (feature, enabled_for_all)
                 VALUES ('force-onboarding', false)`
            );

            return true;
        },
    },
];

export async function applyMigrations(db: Database) {
    global.logger.info("Applying migrations");
    const applied = new Set<number>();
    const dbData: IMigration[] = await db.all<IMigration>("SELECT version FROM migrations");
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
