bot-is-not-admin-leaderboard = ⚠️ 注意！机器人不是群组管理员，因此排行榜可能包含已退群的玩家。建议授予机器人管理员权限并使用'osu clear'命令清理已退出玩家的成绩。

clear-give-admin =
    清理已退出玩家成绩的功能每24小时只能使用一次。

    为避免频繁清理，请授予本群组管理员权限。

clear-sender-not-admin = 只有群组管理员可以使用此命令

clear-started =
    正在清理已退出玩家的成绩...

    当前群组成员数: {$realCount}
    机器人记录的成员数: {$count}

    预计耗时: {$estimateStr}

clear-done =
    已完成清理已退出玩家的成绩

    原记录成员总数: ${count}
    已清理(已退群): ${kicked}
    剩余有效成员: ${remain}