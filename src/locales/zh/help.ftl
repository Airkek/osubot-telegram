# =============================
# Help menu (reworked)
# =============================

help-start-button = 🚀 快速开始
help-syntax-button = 📚 语法与参数
help-osu-servers-button = 🌐 osu! 服务器
help-vr-servers-button = 🎮 BeatSaber 服务器 (BL/SS)
help-main-button = 🔰 主要命令
help-simple-button = 🧩 地图/回放/链接
help-settings-button = ⚙️ 设置
help-admin-button = 🛠 管理 (owner)

help-home-text =
    🆘 帮助
    已按章节整理。请点击下方按钮，或输入：/help <section>。

    快速示例：
    1) 发送谱面链接 — 机器人会显示卡片并记住本群的“最后谱面”。
    2) 选择服务器（如 Bancho）并设置账号。
    3) 使用命令：s user / s top / s recent

    /help 是 “osu help” 的别名。

help-start-text =
    🚀 快速开始

    私聊：
    1) 在需要的服务器上设置账号（见 “osu! 服务器”）。
    2) 之后可以省略用户名 — 机器人会使用已保存的账号。

    群聊：
    1) 发送 beatmap/beatmapset 链接 — compare/leaderboard/map 会使用本群“最后谱面”。
    2) 可选：把机器人设为管理员，提高 chat/leaderboard 的准确性。

    Bancho 常用 Telegram 快捷命令：
    /user, /recent, /top_scores, /chat_leaderboard, /help, /settings

help-syntax-text =
    📚 语法与参数

    通用格式：
    <模块前缀> <命令> [参数...]

    示例：
    s user mrekk
    g top Cookiezi -std
    osu settings

    常用参数：
    • 模式：-std / -t / -ctb / -m
    • Mods：+HDHR（无空格）
    • top 分页：^p2
    • top 额外模式：\N、~PP、>PP（可与 +MODS 组合）
    • 谱面上下文：compare/leaderboard/map 使用“本群最后谱面”。发送谱面链接或成绩链接即可。

    小技巧：回复某人的消息后，user/top/recent 会以该用户为目标。

help-osu-servers-text =
    🌐 osu! 服务器

    请选择一个服务器查看其命令/示例/备注。

help-vr-servers-text =
    🎮 BeatSaber 服务器 (BeatLeader / ScoreSaber)

    通常需要设置数字 ID（详见服务器页面）。

help-main-text =
    🔰 主要命令 (Main 模块)
    前缀：osu

help-simple-text =
    🧩 地图 / 链接 / 回放（自动功能）

    这些是“被动”功能：机器人会对链接/文件自动响应（不需要前缀）。

    • 谱面链接 → 谱面卡片 + 记住本群最后谱面
    • Bancho 成绩链接 (osu.ppy.sh/scores/...) → 成绩卡片 +（可选）回放渲染按钮
    • .osr 文件 → 解析回放；若允许则渲染视频

    对本群最后谱面计算 PP：
    map [+MODS?] [ACC%?] [MISSm?] [COMBOx?] [50x50?]

help-settings-text =
    ⚙️ 设置

    打开菜单：osu settings

    一般有两级：用户设置（仅自己）与群设置（仅群管理员）。

help-admin-text =
    🛠 管理命令（仅 owner）
    前缀：admin

help-admin-hidden =
    此章节仅对机器人 owner 可见。

help-page-not-found =
    未找到该帮助章节，请返回主页。

help-label-website = 🔗 网站：
help-label-prefixes = ⌨️ 前缀：
help-label-commands = 📌 命令：
help-label-notes = ℹ️ 备注：

help-server-osu-howto =
    使用方法：
    1) 先设置账号：nick（Bancho 可用 link）。
    2) 之后可省略用户名。
    3) 群聊中 compare/leaderboard 需要先发送谱面/成绩链接，让机器人“看到”谱面。

help-server-vr-howto =
    使用方法（BeatSaber 服务器）：
    1) 设置 ID：{$prefix} id <数字>。
    2) 之后可省略 ID。

help-unknown-commands-header = 本模块的其他命令：

# -----------------------------
# Command reference blocks
# -----------------------------

help-cmd-link =
    • link / nick / n <code|username>
      绑定 Bancho 账号：通常 {$prefix} link <code>。若绑定服务不可用，则等同于按用户名设置 nick。

help-cmd-nick =
    • nick / n <username>
      保存该服务器用户名，之后可省略。

help-cmd-vr-nick =
    • nick
      此服务器不使用昵称，请用 id 设置数字 ID。

help-cmd-id =
    • id <number>
      设置个人 ID（BeatLeader/ScoreSaber）。

help-cmd-mode =
    • mode <osu|taiko|fruits|mania | 0..3>
      设置默认模式。

help-cmd-user =
    • user / u [username?] [-std|-t|-ctb|-m]
      查看玩家信息；可回复某人消息使用其账号。

help-cmd-recent =
    • recent / r [username?] [-std|-t|-ctb|-m]
      查看最近成绩。

help-cmd-top =
    • top / t [username?] [^pN] [-std|-t|-ctb|-m]
      查看最佳成绩；支持 ^p2 分页、\N/~PP/>PP。

help-cmd-compare =
    • compare / c [username?] [+MODS?] [-std|-t|-ctb|-m]
      查看本群最后谱面上的成绩（需要谱面上下文）。

help-cmd-leaderboard =
    • leaderboard / lb [+MODS?]
      本群最后谱面的排行榜（仅群聊）。

help-cmd-chat =
    • chat [chatId?] [-std|-t|-ctb|-m]
      查看群内玩家排行。

help-cmd-find =
    • find / f <username>
      查找使用该昵称的用户（需对方在设置中允许）。

help-cmd-update =
    • update [-std|-t|-ctb|-m]
      查看个人变化（tracker）。

# -----------------------------
# Main module commands
# -----------------------------

help-cmd-main-help =
    • help
      打开帮助菜单。

help-cmd-main-onboarding =
    • onboarding
      开始/重置 onboarding（同 /start）。

help-cmd-main-settings =
    • settings
      打开设置菜单。

help-cmd-main-status =
    • status
      机器人状态与运行时间。

help-cmd-main-search =
    • search <query>
      在 Bancho 搜索 ranked 谱面。

help-cmd-main-clear =
    • clear
      群内清理已退出成员（需要群管理员权限）。

help-cmd-main-topcmds =
    • topcmds
      统计/监控链接（如果已配置）。

# -----------------------------
# Admin module commands (owner-only)
# -----------------------------

help-cmd-admin-error =
    • e / err / error <code>
      查看错误详情。

help-cmd-admin-ignore =
    • ignore <id|@username>
      忽略/取消忽略用户。

help-cmd-admin-drop =
    • drop ...
      内部命令（owner-only）。

help-cmd-admin-notify =
    • notify
      广播消息（owner-only）。

help-cmd-admin-listfeature =
    • listfeature
      功能开关列表。

help-cmd-admin-enablefeature =
    • enablefeature <name>
      启用功能。

help-cmd-admin-disablefeature =
    • disablefeature <name>
      禁用功能。

help-cmd-admin-clear =
    • clear
      清理/缓存菜单（owner-only）。

# -----------------------------
# Server-specific notes (optional)
# -----------------------------

help-notes-bancho =
    • Bancho 为官方服务器；link 可用时建议使用。

help-notes-gatari =
    • 社区服务器。使用 nick 保存用户名。

help-notes-ripple =
    • 社区服务器。注意：Ripple 与 Ripple!Relax 在机器人内共享同一 profile（nick/mode）。

help-notes-akatsuki =
    • 社区服务器。注意：Akatsuki / Akatsuki!Relax / Akatsuki!AutoPilot 共享同一 profile（nick/mode）。

help-notes-ripple_relax =
    • Ripple 与 Ripple!Relax 在机器人内共享同一 profile（nick/mode）。

help-notes-akatsuki_relax =
    • Akatsuki / Akatsuki!Relax / Akatsuki!AutoPilot 共享同一 profile（nick/mode）。

help-notes-akatsuki_autopilot =
    • Akatsuki / Akatsuki!Relax / Akatsuki!AutoPilot 共享同一 profile（nick/mode）。

help-notes-beatleader =
    • BeatLeader：请使用 id（数字 ID）。

help-notes-scoresaber =
    • ScoreSaber：请使用 id（数字 ID）。
