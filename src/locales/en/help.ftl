to-commands-help-button = ➡️ Commands
to-prefixes-help-button = Prefixes

osuservers-help-button = 🌐 osu! servers
osucommands-help-button = 📝 osu! commands
basiccommands-help-button = 🔰 Basic commands

main-help-text =
    Hello! 😊 Please choose a section for which you would like assistance:

    🌐 osu! servers - list of osu! servers
    📝 osu! commands - commands for osu! servers
    🔰 Basic commands - basic commands

    Advanced help version (more information): https://telegra.ph/Pomoshch-osu-bota-12-11

osucommands-text =
    osu! Commands:
    A question mark (?) in an argument means it is optional.
    Curly braces ({"{"}{"}"}) are for clarity only and should not be included.
    Command {"{"}argument{"}"} - description.

    Command usage: {"{"}server prefix{"}"} {"{"}command{"}"} {"{"}arguments?{"}"}
    Find out the server prefix in the osu! servers section.

    Commands:
    • nick {"{"}username{"}"} - Set your nickname.
    • link {"{"}code{"}"} - Link your Bancho account.
    • mode {"{"}(osu|taiko|mania|fruits){"}"} - Set the default game mode.
    • user {"{"}username?{"}"} - Information about the user.
    • recent {"{"}username?{"}"} - User's last play.
    • top {"{"}username?{"}"} - User's top scores.
    • chat - Top players in the current chat.
    • leaderboard - Top players in the current chat on the last map seen by the bot.
    • compare {"{"}username?{"}"} - Player's score on the last map seen by the bot.

    ⚠️ Attention! Read the osu! servers help to use these commands!

osuservers-text =
    The bot supports several osu! servers. Here they are:
    • Bancho (official osu! server)
    • Gatari
    • Ripple
    • Ripple!Relax
    • Akatsuki
    • Akatsuki!Relax
    • Akatsuki!AutoPilot

    Commands to the servers are accessed through prefixes. Example of a server command:
    s user mrekk

    Here "s" is the server prefix (Bancho), "user" is the server command, "mrekk" is the argument of the server command.

serverprefixes-text =
    Server - prefix:

    • Bancho - s
    • Gatari - g
    • Ripple - r
    • Ripple!Relax - rx
    • Akatsuki - a
    • Akatsuki!Relax - ax
    • Akatsuki!AutoPilot - ap

basiccommands-text =
    Basic module commands:
    osu help - help
    osu status - bot status
    osu topcmds - top command usage
    osu settings - bot settings (admin privileges required for chat settings)
    osu clear - clear the chat top from exited participants (admin privileges required)