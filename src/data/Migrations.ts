import { SqlDatabase, SqlExecutor } from "./SqlExecutor";
import { BeatmapStatus } from "../Types";

export interface IMigration {
    version: number;
    name: string;
    process: (db: SqlExecutor) => Promise<boolean>;
}

const migrations: IMigration[] = [
    {
        version: 1,
        name: "Create tables",
        process: async (db) => {
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
        process: async (db) => {
            await db.run("CREATE TABLE IF NOT EXISTS ignored_users (id BIGINT)");
            return true;
        },
    },
    {
        version: 3,
        name: "Remove all cached covers (migrate from raw to cover@2x)",
        process: async (db) => {
            await db.run("DELETE FROM covers");
            return true;
        },
    },
    {
        version: 4,
        name: "Create osu! beatmap metadata cache table",
        process: async (db) => {
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
        process: async (db) => {
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
        process: async (db) => {
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
        process: async (db) => {
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
        process: async (db) => {
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
        process: async (db) => {
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
        process: async (db) => {
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
        process: async (db) => {
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
        process: async (db) => {
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
        process: async (db) => {
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
        process: async (db) => {
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
        process: async (db) => {
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
        process: async (db) => {
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
        process: async (db) => {
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
        process: async (db) => {
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
        process: async (db) => {
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
        process: async (db) => {
            await db.run("UPDATE settings SET content_output = 'oki-cards'");
            return true;
        },
    },
    {
        version: 21,
        name: "Create 'statistics' table",
        process: async (db) => {
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
        process: async (db) => {
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
        process: async (db) => {
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
        process: async (db) => {
            await db.run(`CREATE TABLE onboarded_users
                          (
                              user_id BIGINT UNIQUE,
                              version INTEGER
                          )`);

            await db.run(
                `INSERT INTO feature_control (feature, enabled_for_all)
                 VALUES ('force-onboarding', false)`
            );

            return true;
        },
    },
    {
        version: 25,
        name: "Enable compression for statistics hypertables",
        process: async (db) => {
            const tables = [
                {
                    name: "bot_events",
                    segmentby: "event_type",
                    orderby: "time DESC",
                },
                {
                    name: "bot_events_metrics",
                    segmentby: "event_type",
                    orderby: "time DESC",
                },
                {
                    name: "bot_events_render",
                    segmentby: "event_type, experimental",
                    orderby: "time DESC",
                },
                {
                    name: "bot_events_commands",
                    segmentby: "module, command",
                    orderby: "time DESC",
                },
                {
                    name: "bot_events_startup",
                    segmentby: "",
                    orderby: "time DESC",
                },
            ];

            for (const table of tables) {
                global.logger.info(`Enabling timescaledb.compress for ${table.name}`);
                let alterQuery = `ALTER TABLE ${table.name} ` + "SET (timescaledb.compress";
                if (table.segmentby) {
                    alterQuery += `, timescaledb.compress_segmentby = '${table.segmentby}'`;
                }
                if (table.orderby) {
                    alterQuery += `, timescaledb.compress_orderby = '${table.orderby}'`;
                }
                alterQuery += ")";

                await db.run(alterQuery);
                global.logger.info(`Adding compression policy for ${table.name}`);
                await db.run(`SELECT add_compression_policy('${table.name}', INTERVAL '7 days')`);
            }

            return true;
        },
    },
    {
        version: 26,
        name: "Set daily chunk interval for high-volume statistics tables",
        process: async (db) => {
            const highVolumeTables = ["bot_events", "bot_events_commands", "bot_events_render"];

            for (const tableName of highVolumeTables) {
                global.logger.info(`Seting daily chunk interval for ${tableName}`);
                await db.run(`SELECT set_chunk_time_interval('${tableName}', INTERVAL '1 day')`);
            }

            return true;
        },
    },
    {
        version: 27,
        name: "Create user_info table for telegram usernames cache",
        process: async (db) => {
            await db.run(`CREATE TABLE IF NOT EXISTS user_info
                          (
                              user_id   BIGINT PRIMARY KEY,
                              username  TEXT,
                              first_name TEXT,
                              last_name  TEXT
                          )`);

            return true;
        },
    },
    {
        version: 28,
        name: "Add display_username to user_info and convert username to lowercase",
        process: async (db) => {
            // Add display_username column
            await db.run(`ALTER TABLE user_info ADD COLUMN display_username TEXT`);

            // Copy username to display_username (preserving original case)
            await db.run(`UPDATE user_info SET display_username = username WHERE username IS NOT NULL`);

            // Convert username to lowercase
            await db.run(`UPDATE user_info SET username = LOWER(username) WHERE username IS NOT NULL`);

            return true;
        },
    },
    {
        version: 29,
        name: "Add enable_find to settings",
        process: async (db) => {
            await db.run(`ALTER TABLE settings ADD COLUMN enable_find BOOLEAN DEFAULT true`);
            return true;
        },
    },
    {
        version: 30,
        name: "Deduplicate and constrain chat memberships",
        process: async (db) => {
            await db.run(`DELETE FROM users_to_chat AS duplicate
                          USING users_to_chat AS keep
                          WHERE duplicate.ctid < keep.ctid
                            AND duplicate.user_id = keep.user_id
                            AND duplicate.chat_id = keep.chat_id`);
            await db.run(
                `CREATE UNIQUE INDEX IF NOT EXISTS users_to_chat_user_chat_unique
                 ON users_to_chat (user_id, chat_id)`
            );
            return true;
        },
    },
    {
        version: 31,
        name: "Expand schema with platform-neutral identities",
        process: async (db) => {
            await db.run(`CREATE TABLE app_users
                          (
                              id         BIGSERIAL PRIMARY KEY,
                              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                          )`);
            await db.run(`CREATE TABLE platform_accounts
                          (
                              id          BIGSERIAL PRIMARY KEY,
                              user_id     BIGINT      NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
                              platform    TEXT        NOT NULL,
                              external_id TEXT        NOT NULL,
                              created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                              UNIQUE (platform, external_id),
                              UNIQUE (user_id, platform)
                          )`);
            await db.run(`CREATE TABLE platform_chats
                          (
                              id          BIGSERIAL PRIMARY KEY,
                              platform    TEXT        NOT NULL,
                              external_id TEXT        NOT NULL,
                              created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                              UNIQUE (platform, external_id)
                          )`);
            await db.run(`CREATE TABLE platform_account_settings
                          (
                              platform_account_id BIGINT PRIMARY KEY
                                  REFERENCES platform_accounts (id) ON DELETE CASCADE,
                              notifications_enabled BOOLEAN NOT NULL DEFAULT true,
                              language_override TEXT NOT NULL DEFAULT 'do_not_override'
                          )`);

            await db.run("ALTER TABLE users ADD COLUMN app_user_id BIGINT");
            await db.run("ALTER TABLE settings ADD COLUMN app_user_id BIGINT");
            await db.run("ALTER TABLE users_to_chat ADD COLUMN platform_account_id BIGINT");
            await db.run("ALTER TABLE users_to_chat ADD COLUMN platform_chat_id BIGINT");
            await db.run("ALTER TABLE ignored_users ADD COLUMN platform_account_id BIGINT");
            await db.run("ALTER TABLE onboarded_users ADD COLUMN platform_account_id BIGINT");
            await db.run("ALTER TABLE user_info ADD COLUMN platform_account_id BIGINT");
            await db.run("ALTER TABLE chat_settings ADD COLUMN platform_chat_id BIGINT");

            await db.run("ALTER TABLE settings ALTER COLUMN user_id DROP NOT NULL");
            await db.run("ALTER TABLE chat_settings ALTER COLUMN chat_id DROP NOT NULL");
            await db.run("ALTER TABLE user_info DROP CONSTRAINT user_info_pkey");
            await db.run("ALTER TABLE user_info ALTER COLUMN user_id DROP NOT NULL");
            await db.run(`CREATE UNIQUE INDEX user_info_legacy_user_id_unique
                          ON user_info (user_id) WHERE user_id IS NOT NULL`);

            return true;
        },
    },
    {
        version: 32,
        name: "Backfill Telegram identities",
        process: async (db) => {
            await db.run(`CREATE TEMP TABLE identity_user_backfill ON COMMIT DROP AS
                          SELECT external_id,
                                 nextval(pg_get_serial_sequence('app_users', 'id'))::BIGINT AS app_user_id,
                                 nextval(pg_get_serial_sequence('platform_accounts', 'id'))::BIGINT AS account_id
                          FROM (SELECT id::TEXT AS external_id FROM users
                                UNION
                                SELECT user_id::TEXT FROM settings
                                UNION
                                SELECT user_id::TEXT FROM users_to_chat
                                UNION
                                SELECT id::TEXT FROM ignored_users
                                UNION
                                SELECT user_id::TEXT FROM onboarded_users
                                UNION
                                SELECT user_id::TEXT FROM user_info) AS external_users
                          WHERE external_id IS NOT NULL`);
            await db.run("ALTER TABLE identity_user_backfill ADD PRIMARY KEY (external_id)");
            await db.run(`INSERT INTO app_users (id)
                          SELECT app_user_id FROM identity_user_backfill`);
            await db.run(`INSERT INTO platform_accounts (id, user_id, platform, external_id)
                          SELECT account_id, app_user_id, 'telegram', external_id
                          FROM identity_user_backfill`);

            await db.run(`INSERT INTO platform_chats (platform, external_id)
                          SELECT 'telegram', external_id
                          FROM (SELECT chat_id::TEXT AS external_id FROM users_to_chat
                                UNION
                                SELECT chat_id::TEXT FROM chat_settings) AS external_chats
                          WHERE external_id IS NOT NULL
                          ON CONFLICT (platform, external_id) DO NOTHING`);

            await db.run(`UPDATE users AS target
                          SET app_user_id = identity.app_user_id
                          FROM identity_user_backfill AS identity
                          WHERE target.id::TEXT = identity.external_id`);
            await db.run(`UPDATE settings AS target
                          SET app_user_id = identity.app_user_id
                          FROM identity_user_backfill AS identity
                          WHERE target.user_id::TEXT = identity.external_id`);
            await db.run(`UPDATE users_to_chat AS target
                          SET platform_account_id = identity.account_id
                          FROM identity_user_backfill AS identity
                          WHERE target.user_id::TEXT = identity.external_id`);
            await db.run(`UPDATE ignored_users AS target
                          SET platform_account_id = identity.account_id
                          FROM identity_user_backfill AS identity
                          WHERE target.id::TEXT = identity.external_id`);
            await db.run(`UPDATE onboarded_users AS target
                          SET platform_account_id = identity.account_id
                          FROM identity_user_backfill AS identity
                          WHERE target.user_id::TEXT = identity.external_id`);
            await db.run(`UPDATE user_info AS target
                          SET platform_account_id = identity.account_id
                          FROM identity_user_backfill AS identity
                          WHERE target.user_id::TEXT = identity.external_id`);
            await db.run(`UPDATE users_to_chat AS target
                          SET platform_chat_id = identity.id
                          FROM platform_chats AS identity
                          WHERE identity.platform = 'telegram'
                            AND target.chat_id::TEXT = identity.external_id`);
            await db.run(`UPDATE chat_settings AS target
                          SET platform_chat_id = identity.id
                          FROM platform_chats AS identity
                          WHERE identity.platform = 'telegram'
                            AND target.chat_id::TEXT = identity.external_id`);

            await db.run(`INSERT INTO platform_account_settings
                              (platform_account_id, notifications_enabled, language_override)
                          SELECT account.id,
                                 COALESCE(settings.notifications_enabled, true),
                                 COALESCE(settings.language_override, 'do_not_override')
                          FROM settings
                          JOIN platform_accounts AS account
                            ON account.user_id = settings.app_user_id
                           AND account.platform = 'telegram'
                          ON CONFLICT (platform_account_id) DO NOTHING`);

            return true;
        },
    },
    {
        version: 33,
        name: "Constrain platform-neutral identities",
        process: async (db) => {
            await db.run(`DELETE FROM users AS duplicate
                          USING users AS keep
                          WHERE duplicate.ctid < keep.ctid
                            AND duplicate.app_user_id = keep.app_user_id
                            AND duplicate.server = keep.server`);
            await db.run(`DELETE FROM stats AS duplicate
                          USING stats AS keep
                          WHERE duplicate.ctid < keep.ctid
                            AND duplicate.id = keep.id
                            AND duplicate.mode = keep.mode
                            AND duplicate.server = keep.server`);
            await db.run(`DELETE FROM ignored_users AS duplicate
                          USING ignored_users AS keep
                          WHERE duplicate.ctid < keep.ctid
                            AND duplicate.platform_account_id = keep.platform_account_id`);

            await db.run(`ALTER TABLE users
                          ADD CONSTRAINT users_app_user_fk
                          FOREIGN KEY (app_user_id) REFERENCES app_users (id) ON DELETE CASCADE`);
            await db.run(`ALTER TABLE settings
                          ADD CONSTRAINT settings_app_user_fk
                          FOREIGN KEY (app_user_id) REFERENCES app_users (id) ON DELETE CASCADE`);
            await db.run(`ALTER TABLE users_to_chat
                          ADD CONSTRAINT users_to_chat_platform_account_fk
                          FOREIGN KEY (platform_account_id) REFERENCES platform_accounts (id) ON DELETE CASCADE`);
            await db.run(`ALTER TABLE users_to_chat
                          ADD CONSTRAINT users_to_chat_platform_chat_fk
                          FOREIGN KEY (platform_chat_id) REFERENCES platform_chats (id) ON DELETE CASCADE`);
            await db.run(`ALTER TABLE ignored_users
                          ADD CONSTRAINT ignored_users_platform_account_fk
                          FOREIGN KEY (platform_account_id) REFERENCES platform_accounts (id) ON DELETE CASCADE`);
            await db.run(`ALTER TABLE onboarded_users
                          ADD CONSTRAINT onboarded_users_platform_account_fk
                          FOREIGN KEY (platform_account_id) REFERENCES platform_accounts (id) ON DELETE CASCADE`);
            await db.run(`ALTER TABLE user_info
                          ADD CONSTRAINT user_info_platform_account_fk
                          FOREIGN KEY (platform_account_id) REFERENCES platform_accounts (id) ON DELETE CASCADE`);
            await db.run(`ALTER TABLE chat_settings
                          ADD CONSTRAINT chat_settings_platform_chat_fk
                          FOREIGN KEY (platform_chat_id) REFERENCES platform_chats (id) ON DELETE CASCADE`);

            await db.run(`CREATE UNIQUE INDEX users_app_user_server_unique
                          ON users (app_user_id, server)`);
            await db.run(`CREATE UNIQUE INDEX settings_app_user_unique
                          ON settings (app_user_id)`);
            await db.run(`CREATE UNIQUE INDEX stats_game_user_mode_unique
                          ON stats (id, server, mode)`);
            await db.run(`CREATE UNIQUE INDEX users_to_chat_identity_unique
                          ON users_to_chat (platform_account_id, platform_chat_id)`);
            await db.run(`CREATE UNIQUE INDEX ignored_users_platform_account_unique
                          ON ignored_users (platform_account_id)`);
            await db.run(`CREATE UNIQUE INDEX onboarded_users_platform_account_unique
                          ON onboarded_users (platform_account_id)`);
            await db.run(`CREATE UNIQUE INDEX user_info_platform_account_unique
                          ON user_info (platform_account_id)`);
            await db.run(`CREATE UNIQUE INDEX chat_settings_platform_chat_unique
                          ON chat_settings (platform_chat_id)`);

            return true;
        },
    },
    {
        version: 34,
        name: "Scope transport-specific data by platform",
        process: async (db) => {
            await db.run("ALTER TABLE covers ADD COLUMN platform TEXT DEFAULT 'telegram'");
            await db.run("ALTER TABLE photos ADD COLUMN platform TEXT DEFAULT 'telegram'");

            for (const table of ["bot_events", "bot_events_render", "bot_events_commands"]) {
                await db.run(`ALTER TABLE ${table} ADD COLUMN platform TEXT DEFAULT 'telegram'`);
                await db.run(`ALTER TABLE ${table} ADD COLUMN platform_account_id BIGINT`);
                await db.run(`ALTER TABLE ${table} ADD COLUMN platform_chat_id BIGINT`);
            }
            await db.run("ALTER TABLE bot_events_metrics ADD COLUMN platform TEXT DEFAULT 'telegram'");
            await db.run("ALTER TABLE bot_events_startup ADD COLUMN platform TEXT DEFAULT 'telegram'");

            await db.run(`DELETE FROM covers AS duplicate
                          USING covers AS keep
                          WHERE duplicate.ctid < keep.ctid
                            AND duplicate.id = keep.id
                            AND duplicate.platform = keep.platform`);
            await db.run(`DELETE FROM photos AS duplicate
                          USING photos AS keep
                          WHERE duplicate.ctid < keep.ctid
                            AND duplicate.url = keep.url
                            AND duplicate.platform = keep.platform`);
            await db.run(`CREATE UNIQUE INDEX covers_platform_id_unique
                          ON covers (platform, id)`);
            await db.run(`CREATE UNIQUE INDEX photos_platform_url_unique
                          ON photos (platform, url)`);

            return true;
        },
    },
    {
        version: 35,
        name: "Add one-time identity link tokens",
        process: async (db) => {
            await db.run(`CREATE TABLE identity_link_tokens
                          (
                              token_hash        TEXT PRIMARY KEY,
                              source_account_id BIGINT      NOT NULL
                                  REFERENCES platform_accounts (id) ON DELETE CASCADE,
                              expires_at        TIMESTAMPTZ NOT NULL,
                              created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
                          )`);
            await db.run(`CREATE INDEX identity_link_tokens_expiry_idx
                          ON identity_link_tokens (expires_at)`);
            return true;
        },
    },
];

export async function applyMigrations(db: SqlDatabase) {
    global.logger.info("Applying migrations");

    for (const migration of migrations) {
        try {
            const applied = await db.transaction(async (tx) => {
                await tx.run("LOCK TABLE migrations IN EXCLUSIVE MODE");
                const existing = await tx.get<{ version: number }>(
                    "SELECT version FROM migrations WHERE version = $1",
                    [migration.version]
                );
                if (existing) {
                    return false;
                }

                global.logger.info(`Processing migration #${migration.version}: ${migration.name}`);
                const res = await migration.process(tx);
                if (!res) {
                    throw new Error(`Migration #${migration.version} returned failure`);
                }
                await tx.run("INSERT INTO migrations (version) VALUES ($1)", [migration.version]);
                return true;
            });

            if (applied) {
                global.logger.info("Success");
            }
        } catch (e) {
            global.logger.error(e);
            throw new Error(`Migration #${migration.version} failed`, { cause: e });
        }
    }
}
