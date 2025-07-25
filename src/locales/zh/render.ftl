already-rendering-warning-chat =
    如果您的群组有其他渲染回放的机器人，请先在当前机器人中关闭渲染功能 - /settings
    否则可能会因为回放中的用户名导致o!rdr封禁。

already-rendering-warning = 该回放已在o!rdr渲染中。

ordr-ban-warning =
    ⚠️ 该回放作者已被o!rdr封禁（昵称匹配）。
    封禁原因可通过将回放上传至o!rdr网站查看。

    请尝试改用实验性渲染器。

render-error-text = 回放渲染错误: {$error}
file-is-too-big-render = 文件太大！
cant-render = 渲染功能不可用

render-in-progress = 回放正在渲染中...

experimental-renderer-warning =
    ⚠️ 正在使用实验性渲染器。部分功能可能不可用或工作异常。
    发现任何问题请在帖子评论区反馈 - https://t.me/osubotupdates/34

render-timeout-warning-minutes = { $minutes ->
    [one] 每分钟
    [few] 每{$minutes}分钟
    *[other] 每{$minutes}分钟
}只能渲染一次回放

experimental-gamemode-unavailable = 该游戏模式仅支持实验性渲染器，当前不可用。请稍后再试。
renderer-unavailable = 选择的渲染器({$renderer})当前不可用。请稍后再试或在设置中更改渲染器。私聊机器人输入/settings进行设置。
renderer-no-replay-frames = 该回放没有可渲染的数据。请重新在 osu! 中导出。
renderer-max-length-exceeded = 渲染支持的最大谱面长度为{$max_minutes}分钟。
renderer-max-starrate-exceeded = 该模式仅支持星级不超过{$max_stars}的谱面进行回放渲染。