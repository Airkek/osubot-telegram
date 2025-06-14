bot-is-not-admin-leaderboard = ⚠️ Warning! The bot is not a chat admin, so the leaderboard may include players who have left the chat. It is recommended to grant the bot admin rights and use the 'osu clear' command to remove departed players from the leaderboard.
clear-give-admin =
    Clearing the leaderboard of left users is recommended to use once every 24 hours.
    
    To avoid needing to clear the leaderboard, please grant the bot admin rights in this chat.
clear-sender-not-admin = Only chat administrators can use this command.
clear-started =
    Cleaning the leaderboard of users who left.
    
    Current chat members: { $realCount }
    Bot-registered chat members: { $count }
    
    Estimated time: { $estimateStr }
clear-done =
    Leaderboard has been cleaned of users who left.
    
    Previously registered chat members: ${ count }
    Removed (no longer in chat): ${ kicked }
    Remaining registered members: ${ remain }
