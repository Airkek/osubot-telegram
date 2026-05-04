# =============================
# Help menu (reworked)
# =============================

help-start-button = 🚀 Getting started
help-syntax-button = 📚 Syntax & arguments
help-osu-servers-button = 🌐 osu! servers
help-vr-servers-button = 🎮 BeatSaber servers (BL/SS)
help-main-button = 🔰 Main commands
help-simple-button = 🧩 Maps/replays/links
help-settings-button = ⚙️ Settings
help-admin-button = 🛠 Admin (owner)

help-home-text =
    🆘 Help
    Everything is split into sections. Use the buttons below or type: /help <section>.

    Quick example:
    1) Send a beatmap link — the bot will show a card and remember the map in this chat.
    2) Pick a server (e.g. Bancho) and set your account.
    3) Use commands: s user / s top / s recent

    /help is an alias to “osu help”.

help-start-text =
    🚀 Getting started

    In private chat:
    1) Set your account on the server you want (see “osu! servers”).
    2) Then you can omit the username — the bot will use your saved one.

    In group chats:
    1) Send a beatmap/beatmapset link — the bot will remember the last map for compare/leaderboard/map.
    2) Optionally make the bot an admin — “chat/leaderboard” can work more reliably.

    Useful Telegram shortcuts (Bancho):
    /user, /recent, /top_scores, /chat_leaderboard, /help, /settings

help-syntax-text =
    📚 Syntax & arguments

    General form:
    <module_prefix> <command> [args...]

    Examples:
    s user mrekk
    g top Cookiezi -std
    osu settings

    Common arguments:
    • Mode: -std / -t / -ctb / -m
    • Mods: +HDHR (no spaces)
    • Page (top): ^p2
    • Extra “top” modes:
      \5 — show the #5 score in top-100
      ~500 — closest score to 500pp
      >450 — count scores above 450pp
      (can be combined with +MODS)
    • Map context: compare/leaderboard/map use “the last map the bot has seen in this chat”.
      Just send a beatmap link or a score link — the bot will remember it.

    Tip: you can reply to someone’s message, and user/top/recent will target that user.

help-osu-servers-text =
    🌐 osu! servers

    Pick a server below — each server page contains commands, examples and notes.

help-vr-servers-text =
    🎮 BeatSaber servers (BeatLeader / ScoreSaber)

    These are BeatSaber-related leaderboards. Usually you need to set your numeric ID (see the server page).

help-main-text =
    🔰 Main commands (Main module)
    Prefix: osu

help-simple-text =
    🧩 Maps / links / replays (auto features)

    These are “passive” features — the bot reacts to links/files even without a prefix.

    • Beatmap/beatmapset link → beatmap card + bot remembers the map in this chat.
    • Bancho score link (osu.ppy.sh/scores/...) → score card + render button (if enabled).
    • .osr file → replay parsing; if allowed — video render.

    PP command for the last remembered map in this chat:
    map [+MODS?] [ACC%?] [MISSm?] [COMBOx?] [50x50?]

    Examples:
    map
    map +HDHR 98%
    map +DT 2m 900x

help-settings-text =
    ⚙️ Settings

    Open menu: osu settings

    The menu usually has two levels:
    • User settings — apply to you only.
    • Chat settings — apply to a specific group; only chat admins can change them.

    Some features (leaderboard/chat) work better if the bot is a chat admin.

help-admin-text =
    🛠 Admin commands (owner-only)
    Prefix: admin

help-admin-hidden =
    This section is available to the bot owner only.

help-page-not-found =
    Help section not found. Please go back to the main page.

help-label-website = 🔗 Website:
help-label-prefixes = ⌨️ Prefixes:
help-label-commands = 📌 Commands:
help-label-notes = ℹ️ Notes:

help-server-osu-howto =
    How to use:
    1) Set your account once: nick (or link on Bancho).
    2) After that you can omit the username — the bot will use the saved one.
    3) In chats, send a beatmap/score link first so the bot “sees” the map for compare/leaderboard.

help-server-vr-howto =
    How to use (BeatSaber servers):
    1) Set your ID: {$prefix} id <number>.
    2) After that you can omit the ID — the bot will use the saved one.

help-unknown-commands-header = Other commands in this module:

# -----------------------------
# Command reference blocks
# -----------------------------

help-cmd-link =
    • link / nick / n <code|username>
      Link your Bancho account. Usually: {$prefix} link <code>. If linking service is disabled — works like nick by username.
      Examples: {$prefix} link ABCD-1234 | {$prefix} nick mrekk

help-cmd-nick =
    • nick / n <username>
      Save your username for this server (so you can omit it later).
      Example: {$prefix} nick mrekk

help-cmd-vr-nick =
    • nick
      Nicknames are not used on this server — set your ID with id.
      Example: {$prefix} id 123456

help-cmd-id =
    • id <number>
      Set your profile ID (BeatLeader/ScoreSaber).
      Example: {$prefix} id 123456

help-cmd-mode =
    • mode <osu|taiko|fruits|mania | 0..3>
      Set default mode for this server.
      Example: {$prefix} mode mania

help-cmd-user =
    • user / u [username?] [-std|-t|-ctb|-m]
      Player profile. If username is omitted — uses the saved one. You can reply to someone’s message.
      Examples: {$prefix} user mrekk | {$prefix} u -mania

help-cmd-recent =
    • recent / r [username?] [-std|-t|-ctb|-m]
      Last play. If username is omitted — uses the saved one.
      Example: {$prefix} r

help-cmd-top =
    • top / t [username?] [^pN] [-std|-t|-ctb|-m]
      Top scores. Pages: ^p2. Extra modes: \N, ~PP, >PP. Mods filter: +HDHR.
      Examples: {$prefix} t ^p2 | {$prefix} t \1 | {$prefix} t ~500 +HDHR

help-cmd-compare =
    • compare / c [username?] [+MODS?] [-std|-t|-ctb|-m]
      Player score on the last map seen by the bot in this chat. Send a map/score link first.
      Example: {$prefix} c +HD

help-cmd-leaderboard =
    • leaderboard / lb [+MODS?]
      Chat leaderboard on the last seen map (needs map context). Group chats only.
      Example: {$prefix} lb +DT

help-cmd-chat =
    • chat [chatId?] [-std|-t|-ctb|-m]
      Chat top by PP. In a group — current chat; in private — you can pass chatId.
      Example: {$prefix} chat

help-cmd-find =
    • find / f <username>
      Find users who saved this nickname (only if they enabled “find” in settings).
      Example: {$prefix} find mrekk

help-cmd-update =
    • update [-std|-t|-ctb|-m]
      Show profile changes (tracker). Requires a saved account.
      Example: {$prefix} update

# -----------------------------
# Main module commands
# -----------------------------

help-cmd-main-help =
    • help
      Open this help menu.
      Example: osu help

help-cmd-main-onboarding =
    • onboarding
      Start/restart onboarding (same as /start).
      Example: osu onboarding

help-cmd-main-settings =
    • settings
      Open settings menu.
      Example: osu settings

help-cmd-main-status =
    • status
      Bot status and uptime.
      Example: osu status

help-cmd-main-search =
    • search <query>
      Search ranked maps on Bancho.
      Example: osu search camellia

help-cmd-main-clear =
    • clear
      In groups: remove left members from chat top (requires chat admin permissions).
      Example: osu clear

help-cmd-main-topcmds =
    • topcmds
      Link to stats/Grafana (if configured).
      Example: osu topcmds

# -----------------------------
# Admin module commands (owner-only)
# -----------------------------

help-cmd-admin-error =
    • e / err / error <code>
      Show stored error by code.
      Example: admin e 12345

help-cmd-admin-ignore =
    • ignore <id|@username>
      Toggle user ignore.
      Example: admin ignore 123

help-cmd-admin-drop =
    • drop ...
      Internal command (owner-only).

help-cmd-admin-notify =
    • notify
      Broadcast message (owner-only). Text is taken from the next lines of the message.
      Example: admin notify\nBroadcast text

help-cmd-admin-listfeature =
    • listfeature
      List feature flags.

help-cmd-admin-enablefeature =
    • enablefeature <name>
      Enable a feature.

help-cmd-admin-disablefeature =
    • disablefeature <name>
      Disable a feature.

help-cmd-admin-clear =
    • clear
      Cleanup/caches menu (owner-only).
      Example: admin clear

# -----------------------------
# Server-specific notes (optional)
# -----------------------------

help-notes-bancho =
    • Bancho is the official server. Use link when available.
    • update shows profile changes between updates.

help-notes-gatari =
    • Community server. Use nick to save your username.

help-notes-ripple =
    • Community server. Note: Ripple and Ripple!Relax share the same profile (nick/mode) in the bot.

help-notes-akatsuki =
    • Community server. Note: Akatsuki, Akatsuki!Relax and Akatsuki!AutoPilot share the same profile (nick/mode) in the bot.

help-notes-ripple_relax =
    • Ripple and Ripple!Relax share the same profile (nick/mode) in the bot.

help-notes-akatsuki_relax =
    • Akatsuki, Akatsuki!Relax and Akatsuki!AutoPilot share the same profile (nick/mode) in the bot.

help-notes-akatsuki_autopilot =
    • Akatsuki, Akatsuki!Relax and Akatsuki!AutoPilot share the same profile (nick/mode) in the bot.

help-notes-beatleader =
    • BeatLeader: use id (numeric profile id). Nicknames are not configured.

help-notes-scoresaber =
    • ScoreSaber: use id (numeric profile id). Nicknames are not configured.
