to-commands-help-button = ➡️ К командам
to-prefixes-help-button = Префиксы

osuservers-help-button = 🌐 osu! servers
osucommands-help-button = 📝 osu! commands
basiccommands-help-button = 🔰 Basic commands

main-help-text =
    Привет! 😊 Выберите, пожалуйста, раздел, по которому вы хотите получить помощь:

    🌐 osu! servers - список осу серверов
    📝 osu! commands - команды для серверов осу
    🔰 Basic commands - базовые команды

    Продвинутая версия помощи (больше информации): https://telegra.ph/Pomoshch-osu-bota-12-11


osucommands-text =
    Команды osu!:
    Знак вопроса (?) в аргументе означает что он необязателен
    Фигурные скобки ({"{"}{"}"}) указаны только для наглядности, их писать не нужно
    Команда {"{"}аргумент{"}"} - описание

    Использование команды: {"{"}префикс сервера{"}"} {"{"}команда{"}"} {"{"}аргументы?{"}"}
    Префикс сервера узнавать в разделе osu! servers

    Команды:
    • nick {"{"}username{"}"} - Установить ник
    • link {"{"}code{"}"} - Привязать аккаунт Bancho
    • mode {"{"}(osu|taiko|mania|fruits){"}"} - Установить режим игры по умолчанию
    • user {"{"}username?{"}"} - Информация о пользователе
    • recent {"{"}username?{"}"} - Последний плей пользователя
    • top {"{"}username?{"}"} - Топ-скоры пользователя
    • chat - Топ игроков текущей беседы
    • leaderboard - Топ игроков текущей беседы на последней карте, которую видел бот
    • compare {"{"}username?{"}"} - Скор игрока на последней карте, которую видел бот

    ⚠️Внимание! Прочитайте помощь по osu! серверам чтобы использовать эти команды!

osuservers-text =
    Бот поддерживает несколько osu! серверов. Вот они:
    • Bancho (официальный сервер osu!)
    • Gatari
    • Ripple
    • Ripple!Relax
    • Akatsuki
    • Akatsuki!Relax
    • Akatsuki!AutoPilot

    Обращения к командам серверов происходит через префиксы. Пример команды сервера:
    s user mrekk

    Здесь "s" - префикс сервера (Bancho), "user" - команда сервера, "mrekk" - аргумент команды сервера

serverprefixes-text =
    Сервер - префикс:

    • Bancho - s
    • Gatari - g
    • Ripple - r
    • Ripple!Relax - rx
    • Akatsuki - a
    • Akatsuki!Relax - ax
    • Akatsuki!AutoPilot - ap

basiccommands-text =
    Команды Basic модуля:
    osu help - помощь
    osu status - статус бота
    osu topcmds - топ использования команд
    osu settings - настройки бота (для редактирования настроек чатанеобходимо быть его администратором)
    osu clear - очистить топ чата от вышедших участников (необходимо быть администратором чата)
