to-commands-help-button = ➡️ 查看命令
to-prefixes-help-button = 命令前缀

osuservers-help-button = 🌐 osu! 服务器
osucommands-help-button = 📝 osu! 命令
basiccommands-help-button = 🔰 基础命令

main-help-text =
    你好！😊 请选择需要查看的帮助分类：

    🌐 osu! 服务器 - 支持的osu!服务器列表
    📝 osu! 命令 - 服务器相关命令
    🔰 基础命令 - 基础功能命令

    完整版帮助文档(更多信息): https://telegra.ph/Pomoshch-osu-bota-12-11

osucommands-text =
    osu! 命令说明:
    参数中的问号(?)表示该参数可选
    大括号({"{"}{"}"})仅用于示意，实际不需要输入
    命令 {"{"}参数{"}"} - 说明

    命令格式: {"{"}服务器前缀{"}"} {"{"}命令{"}"} {"{"}参数?{"}"}
    服务器前缀请查看"osu! 服务器"部分

    可用命令:
    • nick {"{"}用户名{"}"} - 设置osu!用户名
    • link {"{"}code{"}"} - 绑定 Bancho 账号
    • mode {"{"}(osu|taiko|mania|fruits){"}"} - 设置默认游戏模式
    • user {"{"}用户名?{"}"} - 查看用户信息
    • recent {"{"}用户名?{"}"} - 查看最近游玩记录
    • top {"{"}用户名?{"}"} - 查看用户最佳成绩
    • chat - 查看当前群组玩家排名
    • leaderboard - 查看当前群组在最近谱面的排名
    • compare {"{"}用户名?{"}"} - 查看用户在最近谱面的成绩

    ⚠️注意！使用这些命令前请先阅读osu!服务器帮助！

osuservers-text =
    本机器人支持多个osu!服务器:
    • Bancho (官方osu!服务器)
    • Gatari
    • Ripple
    • Ripple!Relax
    • Akatsuki
    • Akatsuki!Relax
    • Akatsuki!AutoPilot

    使用服务器命令需要添加前缀，例如:
    s user mrekk

    其中"s"是服务器前缀(Bancho)，"user"是命令，"mrekk"是参数

serverprefixes-text =
    服务器对应前缀:

    • Bancho - s
    • Gatari - g
    • Ripple - r
    • Ripple!Relax - rx
    • Akatsuki - a
    • Akatsuki!Relax - ax
    • Akatsuki!AutoPilot - ap

basiccommands-text =
    基础模块命令:
    osu help - 查看帮助
    osu status - 查看机器人状态
    osu topcmds - 查看最常用命令统计
    osu settings - 机器人设置(编辑群组设置需管理员权限)
    osu clear - 清理已退出成员的成绩(需群组管理员权限)