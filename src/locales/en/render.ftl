already-rendering-warning-chat =
    If there is another bot in your chat that is rendering replays, disable rendering for this chat in the current bot - /settings
    If you do not do this, there is a risk of being banned on o!rdr by the nickname from the replay.

already-rendering-warning = This replay is already being rendered on o!rdr.

ordr-ban-warning =
    ⚠️ The replay owner is banned from o!rdr (nickname match).
    Reason for the ban can be checked by uploading the replay to o!rdr's website.

    Try using the experimental renderer instead.

render-error-text = "Error while rendering the replay: {$error}
file-is-too-big-render = The file is too big!
cant-render = "Rendering is unavailable"

render-in-progress = Rendering the replay is in progress...

experimental-renderer-warning =
    ⚠️ An experimental renderer is being used. Some features may be unavailable or may not work correctly.
    Please report any bugs found in the comments to the post - https://t.me/osubotupdates/34

render-timeout-warning-minutes = Replay rendering is available once every { $minutes ->
    [one] minute
    *[other] {$minutes} minutes
}

experimental-gamemode-unavailable = This game mode is only supported by the experimental renderer, which is currently unavailable. Please try again later.
renderer-unavailable = The selected renderer ({$renderer}) is currently unavailable. Please try again later or change the renderer in the settings. To do this, enter /settings in private messages with the bot.
renderer-no-replay-frames = The replay has no data to render. Try re-exporting it in osu!.
renderer-max-length-exceeded = The maximum beatmap length for rendering is {$max_minutes} minutes.
renderer-max-starrate-exceeded = This mode supports replay rendering only for maps up to {$max_stars} stars.