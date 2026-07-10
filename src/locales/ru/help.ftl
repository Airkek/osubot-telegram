# =============================
# Help menu (reworked)
# =============================

help-start-button = 🚀 Быстрый старт
help-syntax-button = 📚 Синтаксис и аргументы
help-osu-servers-button = 🌐 osu! сервера
help-vr-servers-button = 🎮 BeatSaber сервера (BL/SS)
help-main-button = 🔰 Основные команды
help-simple-button = 🧩 Карты/реплеи/ссылки
help-settings-button = ⚙️ Настройки
help-admin-button = 🛠 Админ (owner)

help-home-text =
    🆘 Помощь
    Здесь собраны команды и «как пользоваться» по разделам. Нажмите кнопку ниже или используйте: /help <раздел>.

    Быстрый пример:
    1) Отправьте в чат ссылку на карту — бот покажет карточку и запомнит карту.
    2) Выберите сервер (например Bancho) и укажите аккаунт.
    3) Пишите команды: s user / s top / s recent

    /help — это алиас к «osu help».

help-start-text =
    🚀 Быстрый старт

    В ЛС:
    1) Укажите аккаунт на нужном сервере (см. раздел “osu! сервера”).
    2) Используйте команды без ника — бот возьмёт сохранённый.

    В группах:
    1) Отправьте ссылку на beatmap/beatmapset — бот запомнит последнюю карту для compare/leaderboard/map.
    2) При желании дайте боту права администратора — так команды “chat/leaderboard” смогут точнее учитывать участников.

    Полезные шорткаты (Bancho):
    /user, /recent, /top_scores, /chat_leaderboard, /help, /settings

help-syntax-text =
    📚 Синтаксис и аргументы

    Общий формат:
    <префикс_модуля> <команда> [аргументы...]

    Примеры:
    s user mrekk
    g top Cookiezi -std
    osu settings

    Важные аргументы:
    • Режим игры: -std / -t / -ctb / -m
    • Моды: +HDHR (без пробела)
    • Страница (для top): ^p2
    • “top” доп. режимы:
      \5 — показать 5-й скор в топ-100
      ~500 — найти скор ближе всего к 500pp
      >450 — посчитать, сколько скоров выше 450pp
      (можно вместе с +MODS)
    • Контекст карты: compare/leaderboard/map используют “последнюю карту, которую видел бот в этом чате”.
      Просто отправьте ссылку на карту или на скор — бот её запомнит.

    Лайфхак: можно отвечать на сообщение пользователя (reply) и тогда команды user/top/recent применятся к нему.

help-osu-servers-text =
    🌐 osu! сервера

    Выберите сервер ниже — на странице сервера будут команды, примеры и заметки.

help-vr-servers-text =
    🎮 BeatSaber сервера (BeatLeader / ScoreSaber)

    Это лидерборды по BeatSaber. Обычно вместо “nick” нужно задать свой ID (см. страницу сервера).

help-main-text =
    🔰 Основные команды (модуль Main)
    Префикс: osu

help-simple-text =
    🧩 Карты / ссылки / реплеи (авто-команды)

    Это «пассивные» функции — бот срабатывает на ссылки и файлы, даже без префикса.

    • Ссылка на карту (beatmap/beatmapset) → карточка карты + бот запоминает карту в чате.
    • Ссылка на скор Bancho (osu.ppy.sh/scores/...) → карточка скора + кнопка рендера (если включено).
    • Файл .osr → разбор реплея; если разрешено — рендер видео.

    Команда для PP по последней карте в чате:
    map [+MODS?] [ACC%?] [MISSm?] [COMBOx?] [50x50?]

    Примеры:
    map
    map +HDHR 98%
    map +DT 2m 900x

help-settings-text =
    ⚙️ Настройки

    Открыть меню: osu settings

    В меню обычно есть 2 уровня:
    • Личные настройки — действуют только для вас.
    • Настройки чата — действуют для конкретной группы; менять может только админ чата.

    Некоторые функции (например leaderboard/chat) работают лучше, если бот — админ чата.

help-admin-text =
    🛠 Админ-команды (только для владельца бота)
    Префикс: admin

help-admin-hidden =
    Этот раздел доступен только владельцу бота.

help-page-not-found =
    Раздел помощи не найден. Вернитесь на главную страницу.

help-label-website = 🔗 Сайт:
help-label-prefixes = ⌨️ Префиксы:
help-label-commands = 📌 Команды:
help-label-notes = ℹ️ Примечания:

help-server-osu-howto =
    Как пользоваться:
    1) Один раз задайте аккаунт: nick (или link для Bancho).
    2) Дальше ник можно не писать — бот возьмёт сохранённый.
    3) В чатах для compare/leaderboard сначала отправьте ссылку на карту/скор, чтобы бот “увидел” карту.

help-server-vr-howto =
    Как пользоваться (BeatSaber сервера):
    1) Задайте свой ID: {$prefix} id <число>.
    2) Дальше команды можно писать без ID — бот возьмёт сохранённый.

help-unknown-commands-header = Другие команды этого модуля:

# -----------------------------
# Command reference blocks
# -----------------------------

help-cmd-link =
    • link / nick / n <code|username>
      Привязка Bancho-аккаунта. Обычно: {$prefix} link <код>. Если сервис привязки отключён — работает как nick по username.
      Примеры: {$prefix} link ABCD-1234 | {$prefix} nick mrekk

help-cmd-nick =
    • nick / n <username>
      Сохранить ник на этом сервере (чтобы дальше можно было писать команды без ника).
      Пример: {$prefix} nick mrekk

help-cmd-vr-nick =
    • nick
      На этом сервере ник не используется — задайте ID через команду id.
      Пример: {$prefix} id 123456

help-cmd-id =
    • id <число>
      Задать ID профиля (BeatLeader/ScoreSaber).
      Пример: {$prefix} id 123456

help-cmd-mode =
    • mode <osu|taiko|fruits|mania | 0..3>
      Установить режим по умолчанию для команд этого сервера.
      Пример: {$prefix} mode mania

help-cmd-user =
    • user / u [username?] [-std|-t|-ctb|-m]
      Профиль игрока. Если ник не указан — берётся сохранённый. Можно ответить (reply) на сообщение.
      Примеры: {$prefix} user mrekk | {$prefix} u -mania

help-cmd-recent =
    • recent / r [username?] [-std|-t|-ctb|-m]
      Последняя игра игрока. Если ник не указан — берётся сохранённый.
      Пример: {$prefix} r

help-cmd-top =
    • top / t [username?] [^pN] [-std|-t|-ctb|-m]
      Топ-скоры. Страницы: ^p2. Доп. режимы: \N, ~PP, >PP. Фильтр модов: +HDHR.
      Примеры: {$prefix} t ^p2 | {$prefix} t \1 | {$prefix} t ~500 +HDHR

help-cmd-compare =
    • compare / c [username?] [+MODS?] [-std|-t|-ctb|-m]
      Скор игрока на последней карте, которую видел бот в этом чате. Сначала отправьте карту/скор.
      Пример: {$prefix} c +HD

help-cmd-leaderboard =
    • leaderboard / lb [+MODS?]
      Топ участников текущего чата на последней карте (нужен контекст карты). Работает только в группах.
      Пример: {$prefix} lb +DT

help-cmd-chat =
    • chat [chatId?] [-std|-t|-ctb|-m]
      Топ игроков чата по PP. В группе — по текущему чату; в ЛС можно указать chatId.
      Пример: {$prefix} chat

help-cmd-find =
    • find / f <username>
      Найти пользователей, которые сохранили этот ник (если они разрешили “find” в настройках).
      Пример: {$prefix} find mrekk

help-cmd-update =
    • update [-std|-t|-ctb|-m]
      Показать изменения профиля (трекер). Нужен сохранённый аккаунт.
      Пример: {$prefix} update

# -----------------------------
# Main module commands
# -----------------------------

help-cmd-main-help =
    • help
      Открыть это меню помощи.
      Пример: osu help

help-cmd-main-onboarding =
    • onboarding
      Запустить/повторить onboarding (то же, что /start).
      Пример: osu onboarding

help-cmd-main-settings =
    • settings
      Открыть меню настроек.
      Пример: osu settings

help-cmd-main-status =
    • status
      Статус бота и аптайм.
      Пример: osu status

help-cmd-main-search =
    • search <текст>
      Поиск ranked-карт на Bancho.
      Пример: osu search camellia

help-cmd-main-clear =
    • clear
      В группе: очистить топ чата от вышедших участников (нужны права админа чата).
      Пример: osu clear

help-cmd-main-topcmds =
    • topcmds
      Ссылка на статистику/графану (если настроено).
      Пример: osu topcmds

# -----------------------------
# Admin module commands (owner-only)
# -----------------------------

help-cmd-admin-error =
    • e / err / error <код>
      Показать сохранённую ошибку по коду.
      Пример: admin e 12345

help-cmd-admin-ignore =
    • ignore <id|@username>
      Переключить игнор пользователя.
      Пример: admin ignore 123

help-cmd-admin-drop =
    • drop ...
      Служебная команда (owner-only).

help-cmd-admin-notify =
    • notify
      Рассылка сообщения пользователям/чатам (owner-only). Текст берётся из следующих строк сообщения.
      Пример: admin notify\nТекст рассылки

help-cmd-admin-listfeature =
    • listfeature
      Показать фичи/флаги.

help-cmd-admin-enablefeature =
    • enablefeature <name>
      Включить фичу.

help-cmd-admin-disablefeature =
    • disablefeature <name>
      Выключить фичу.

help-cmd-admin-clear =
    • clear
      Меню очистки кэшей/таблиц (owner-only).
      Пример: admin clear

# -----------------------------
# Server-specific notes (optional)
# -----------------------------

help-notes-bancho =
    • Bancho — официальный сервер. Для надёжной привязки используйте link (если доступно).
    • Команда update показывает изменения профиля между обновлениями.

help-notes-gatari =
    • Комьюнити-сервер. Используйте nick, чтобы сохранить никнейм.

help-notes-ripple =
    • Комьюнити-сервер. Важно: Ripple и Ripple!Relax используют общий профиль (nick/mode) в боте.

help-notes-akatsuki =
    • Комьюнити-сервер. Важно: Akatsuki, Akatsuki!Relax и Akatsuki!AutoPilot используют общий профиль (nick/mode) в боте.

help-notes-ripple_relax =
    • Ripple и Ripple!Relax используют общий профиль (nick/mode) в боте.

help-notes-akatsuki_relax =
    • Akatsuki, Akatsuki!Relax и Akatsuki!AutoPilot используют общий профиль (nick/mode) в боте.

help-notes-akatsuki_autopilot =
    • Akatsuki, Akatsuki!Relax и Akatsuki!AutoPilot используют общий профиль (nick/mode) в боте.

help-notes-beatleader =
    • Для BeatLeader используйте id (числовой ID профиля). Никнейм не настраивается.

help-notes-scoresaber =
    • Для ScoreSaber используйте id (числовой ID профиля). Никнейм не настраивается.

help-cmd-account =
    • account [код]
      Создать одноразовый код или привязать текущую платформу к существующему аккаунту бота.
