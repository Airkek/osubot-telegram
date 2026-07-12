server-name = [Server: {$server}]

players-top-scores = {$player_name}'s top scores
players-recent-score = {$player_name}'s recent score

best-scores-header = Top Scores
best-scores-subheader = by {$player_name} on {$date}

map-leaderboard-header = Chat leaderboard for this map:
leaderboard-card-header = Chat leaderboard
leaderboard-card-subheader = {$artist} — {$title} [{$difficulty}]
leaderboard-rate-limited = The leaderboard can only be requested once per minute. Try again in {$seconds} seconds.
leaderboard-cache-expired = This leaderboard has expired. Run the command again.
leaderboard-refresh-required = The leaderboard data was invalidated. Press refresh again.
nobody-played-this-map = No one has scores on this map yet!

unknown-game-mode-error = Error: Unknown game mode!

mode-set-not-specified =
    No game mode specified!
    Usage: {$prefix} mode <mode>
    Available game modes:

mode-set-invalid =
    Invalid game mode!
    Available game modes:

game-mode-set = Game mode set!

search-not-specified = Please specify a search query
search-not-found = No ranked beatmaps found
search-result-header = Search results:

use-id-command-instead-of-nick =
    This leaderboard does not support setting a nickname!
    Set your ID using {$prefix} id <id>

not-found-scores-with-mod-combo = No top scores found with this mod combination!
near-pp-score = Player's closest score to {$pp}pp
top-n-score = Player's top #{$place} Score
max-page-error = Invalid page. Max pages: {$pages}
score-count = Player {$player_name} has { $count ->
    [one] {$count} score
    *[other] {$count} scores
} above {$pp}pp

nickname-set = Nickname set
user-id-set = Id set
user-not-found = User doesn't exist!
nickname-not-specified =
    No username specified!
    Usage: {$prefix} nick <username>
user-id-not-specified =
    No ID specified!
    Usage: {$prefix} id <user_id>

user-nickname-not-specified =
    This user doesn't have a nickname set!
    Set one using: {$prefix} nick <username>

sender-nickname-not-specified =
    No nickname specified!
    Set yours using: {$prefix} nick <username>

link-code-not-specified-with-url =
    Please provide a link code.
    Open: {$url}
    Then send: {$prefix} link <code>

link-code-invalid =
    Invalid or expired link code.
    Open: {$url}
    Then send: {$prefix} link <code>
link-service-unavailable = Link service is temporarily unavailable. Please try again later.
link-restricted-warning = Warning: your osu! account is restricted. Some features may be unavailable.

unknown-username = This user is unknown to the bot!

specify-nickname = Please, specify the nickname!
no-users-found-nickname-find = No users found with this username!
users-with-nickname-find = Users with username '{$nickname}'

command-for-chats-only = This command only works in group chats!
send-beatmap-first = Please send the beatmap first!

best-players-score-on-this-beatmap = Player's best score on this beatmap

chat-id-invalid = Invalid ID!
give-chat-id = Please provide the chat ID!
top-15-of-chat = Chat Top 15

osutrack-detailed-data-url = View detailed data here: {$url}
osutrack-new-highscores = { $count ->
    [0] No new highscores
    [one] {$count} new highscore
    *[other] {$count} new highscores
}
osutrack-and-scores-more = and { $count ->
    [one] {$count} score
    *[other] {$count} scores
} more...
osutrack-rank-pp = Rank: {$rank} ({$pp} pp) in {$playcount ->
    [one] {$playcount} play
    *[other] {$playcount} plays
}
