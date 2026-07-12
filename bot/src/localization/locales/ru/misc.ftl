server-name = [Сервер: {$server}]

players-top-scores = Топ скоры игрока {$player_name}
players-recent-score = Последний плей игрока {$player_name}

best-scores-header = Топ скоры
best-scores-subheader = игрока {$player_name} от {$date}

map-leaderboard-header = Топ беседы на карте:
nobody-played-this-map = Ни у кого нет скоров на этой карте!

unknown-game-mode-error = Произошла ошибка: неизвестный режим игры!

mode-set-not-specified =
    Не указан режим!
    Использование: {$prefix} mode <режим>
    Доступные режимы:

mode-set-invalid =
    Некорректный режим!
    Доступные режимы:

game-mode-set = Режим установлен!

search-not-specified = Укажите запрос для поиска
search-not-found = Не найдено ни одной ранкнутой карты
search-result-header = Результат поиска:

use-id-command-instead-of-nick =
    Для этого лидерборда недоступна установка никнейма!
    Установите свой id, используя {$prefix} id <id>

not-found-scores-with-mod-combo = Не найдено топ скоров с указанной комбинацией модов!
near-pp-score = Ближайший к {$pp}pp скор игрока
top-n-score = Топ #{$place} скор игрока
max-page-error = Такой страницы нет, всего страниц: {$pages}
score-count = У игрока {$player_name} { $count ->
    [one] {$count} скор
    [few] {$count} скора
    *[other] {$count} скоров
} больше {$pp} pp

nickname-set = Установлен ник
user-id-set = Установлен id
user-not-found =
    Такого пользователя не существует!
nickname-not-specified =
    Не указан ник!
    Использование: {$prefix} nick <ник>
user-id-not-specified =
    Не указан id!
    Использование: {$prefix} id <id>

user-nickname-not-specified =
    У этого пользователя не указан ник!
    Привяжите через {$prefix} nick <ник>

sender-nickname-not-specified =
    Не указан ник!
    Привяжите через {$prefix} nick <ник>

link-code-not-specified-with-url =
    Укажите код привязки!
    Откройте: {$url}
    Затем отправьте: {$prefix} link <code>

link-code-invalid =
    Неверный или просроченный код привязки.
    Откройте: {$url}
    Затем отправьте: {$prefix} link <code>

link-service-unavailable = Сервис привязки временно недоступен. Попробуйте позже.
link-restricted-warning = Внимание: ваш аккаунт osu! ограничен. Некоторые функции могут быть недоступны.

unknown-username = Этот пользователь неизвестен боту!

specify-nickname = Укажите ник!
no-users-found-nickname-find = Не найдено пользователей с таким ником!
users-with-nickname-find = Пользователи с ником '{$nickname}'

command-for-chats-only = Эту команду можно использовать только в беседах!
send-beatmap-first = Сначала отправьте карту!

best-players-score-on-this-beatmap = Лучший скор игрока на этой карте

chat-id-invalid = Некорректный ID!
give-chat-id = Укажите ID беседы!
top-15-of-chat = Топ-15 беседы

osutrack-detailed-data-url = Посмотреть подробные данные: {$url}
osutrack-new-highscores = { $count ->
[0] Новых топскоров нет
[one] {$count} новый топскор
[few] {$count} новых топскора
*[many] {$count} новых топскоров
}
osutrack-and-scores-more = и ещё { $count ->
[one] {$count} топскор
[few] {$count} топскора
*[many] {$count} топскоров
}...
osutrack-rank-pp = Ранг: {$rank} ({$pp} pp) за {$playcount ->
[one] {$playcount} игру
[few] {$playcount} игры
*[many] {$playcount} игр
}
