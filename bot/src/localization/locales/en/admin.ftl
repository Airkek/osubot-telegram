admin-user-target-required = Forward a message or provide a user ID.
admin-invalid-user-id = Invalid user ID.
admin-drop-success = Nickname links for {$user} have been removed.
admin-ignore-added = {$user} has been added to the ignore list.
admin-ignore-removed = {$user} has been removed from the ignore list.

admin-feature-state-enabled = enabled
admin-feature-state-disabled = disabled
admin-feature-not-found =
    Feature not found. Available features:
    {$features}
admin-feature-list =
    Available features:
    {$features}
admin-feature-enabled = Feature {$feature} has been enabled.
admin-feature-disabled = Feature {$feature} has been disabled.

admin-topic-telegram-only = Topic settings are only available in Telegram groups.
admin-topic-admin-required = Only group administrators can change topic settings.
admin-topic-unknown = not in a topic
admin-topic-none = none
admin-topic-status =
    Current topic ID: {$topic}
    Topics where the bot is disabled: {$blocked}
    Use “/topicbot deny [topic_id]” or “/topicbot allow [topic_id]”. Without an ID, the current topic is used.
admin-topic-usage = Use “/topicbot deny [topic_id]”, “/topicbot allow [topic_id]”, or “/topicbot list”.
admin-topic-id-required = Provide a topic ID or run this command inside the topic.
admin-topic-invalid-id = Invalid topic ID. It must be a positive integer.
admin-topic-state-enabled = enabled
admin-topic-state-disabled = disabled
admin-topic-updated = Bot replies in topic {$topic} are now {$state}. Use /topicbot allow or /topicbot deny to change this.

admin-error-not-found = No error with this code was found.
admin-error-details =
    Error {$code}:
    {$info}

    {$error}

admin-notify-cancelled = Broadcast cancelled.
admin-notify-started = Broadcast started.
admin-notify-finished =
    Broadcast finished.
    Messages sent: {$sent}
    Errors: {$errors}
    Invalid chats: {$dirtyChats}
admin-notify-text-required = Broadcast text is required.
admin-notify-audience =
    Recipients:
    Users: {$users}
    Chats: {$chats}
admin-notify-button-all = ✅ Send to everyone
admin-notify-button-users = ✅ Send to users only
admin-notify-button-chats = ✅ Send to chats only

admin-clear-menu =
    admin clear menu.
    Choose an action:
admin-clear-unknown-server = Server “{$server}” was not found. Choose a server from the menu.
admin-clear-unknown-action = Unknown clear action. Choose an action from the menu.
admin-clear-running = Clearing…
admin-clear-no-changes = No changes

admin-clear-beatmap-result = Beatmap metadata cache cleared. Rows removed: {$removed}
admin-clear-images-result =
    Image cache cleared.
    Covers removed: {$covers}
    Photos removed: {$photos}
    Total removed: {$total}
admin-clear-links-result = Nickname links cleared ({$server}). Rows removed: {$removed}
admin-clear-stats-result = Player statistics cache cleared ({$server}). Rows removed: {$removed}
admin-clear-chats-running = Checking chats. Total chats: {$count}
admin-clear-chats-result =
    Chat cleanup finished.

    Chats before cleanup: {$before}
    Chats removed: {$removed}
    Chats remaining: {$remaining}

admin-clear-select-server-links = Choose a server whose nickname links should be cleared:
admin-clear-select-server-stats = Choose a server whose statistics cache should be cleared:
admin-clear-confirmation =
    Confirm clearing {$description}.
    {$details}

admin-clear-description-beatmaps = the beatmap metadata cache
admin-clear-description-images = the image cache
admin-clear-description-chats = invalid chats
admin-clear-description-links = nickname links ({$server})
admin-clear-description-stats = the player statistics cache ({$server})

admin-clear-preview-beatmaps = Rows currently cached: {$count}
admin-clear-preview-images = Currently cached: covers={$covers}, photos={$photos}
admin-clear-preview-chats = Chats to check: {$count}
admin-clear-preview-rows = Rows to remove: {$count}

admin-clear-all-servers = all servers
admin-clear-button-menu = ⬅ Clear menu
admin-clear-button-beatmaps = 🗂 Clear beatmap metadata cache
admin-clear-button-links = 🧷 Clear nickname links
admin-clear-button-images = 🖼 Clear image cache
admin-clear-button-stats = 📊 Clear player statistics cache
admin-clear-button-chats = 🧹 Remove invalid chats
admin-clear-button-all-servers = 🌐 All servers
admin-clear-button-back = ⬅ Back
admin-clear-button-confirm = ✅ Confirm
