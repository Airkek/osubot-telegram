admin-user-target-required = 请转发一条消息或提供用户 ID。
admin-invalid-user-id = 用户 ID 无效。
admin-drop-success = 已删除 {$user} 的用户名绑定。
admin-ignore-added = 已将 {$user} 加入忽略列表。
admin-ignore-removed = 已将 {$user} 移出忽略列表。

admin-feature-state-enabled = 已启用
admin-feature-state-disabled = 已禁用
admin-feature-not-found =
    未找到该功能。可用功能：
    {$features}
admin-feature-list =
    可用功能：
    {$features}
admin-feature-enabled = 已启用功能 {$feature}。
admin-feature-disabled = 已禁用功能 {$feature}。

admin-topic-telegram-only = 话题设置仅适用于 Telegram 群组。
admin-topic-admin-required = 只有群组管理员可以更改话题设置。
admin-topic-unknown = 当前不在话题中
admin-topic-none = 无
admin-topic-status =
    当前话题 ID：{$topic}
    已禁用机器人的话题：{$blocked}
    使用“/topicbot deny [topic_id]”或“/topicbot allow [topic_id]”。不填写 ID 时使用当前话题。
admin-topic-usage = 使用“/topicbot deny [topic_id]”、“/topicbot allow [topic_id]”或“/topicbot list”。
admin-topic-id-required = 请提供话题 ID，或在话题中运行此命令。
admin-topic-invalid-id = 话题 ID 无效，必须为正整数。
admin-topic-state-enabled = 已启用
admin-topic-state-disabled = 已禁用
admin-topic-updated = 话题 {$topic} 中的机器人回复现已{$state}。使用 /topicbot allow 或 /topicbot deny 可更改设置。

admin-error-not-found = 未找到该错误代码。
admin-error-details =
    错误 {$code}：
    {$info}

    {$error}

admin-notify-cancelled = 广播已取消。
admin-notify-started = 广播已开始。
admin-notify-finished =
    广播已完成。
    已发送消息：{$sent}
    错误：{$errors}
    无效群聊：{$dirtyChats}
admin-notify-text-required = 请提供广播内容。
admin-notify-audience =
    接收者：
    用户：{$users}
    群聊：{$chats}
admin-notify-button-all = ✅ 发送给所有人
admin-notify-button-users = ✅ 仅发送给用户
admin-notify-button-chats = ✅ 仅发送给群聊

admin-clear-menu =
    admin clear 菜单。
    请选择操作：
admin-clear-unknown-server = 未找到服务器“{$server}”。请从菜单中选择服务器。
admin-clear-unknown-action = 未知的清理操作。请从菜单中选择。
admin-clear-running = 正在清理…
admin-clear-no-changes = 没有变化

admin-clear-beatmap-result = 已清理谱面元数据缓存。删除记录：{$removed}
admin-clear-images-result =
    已清理图片缓存。
    删除封面：{$covers}
    删除图片：{$photos}
    总计删除：{$total}
admin-clear-links-result = 已清理用户名绑定（{$server}）。删除记录：{$removed}
admin-clear-stats-result = 已清理玩家统计缓存（{$server}）。删除记录：{$removed}
admin-clear-chats-running = 正在检查群聊。群聊总数：{$count}
admin-clear-chats-result =
    群聊清理完成。

    清理前：{$before}
    已删除：{$removed}
    剩余：{$remaining}

admin-clear-select-server-links = 请选择要清理用户名绑定的服务器：
admin-clear-select-server-stats = 请选择要清理统计缓存的服务器：
admin-clear-confirmation =
    请确认清理{$description}。
    {$details}

admin-clear-description-beatmaps = 谱面元数据缓存
admin-clear-description-images = 图片缓存
admin-clear-description-chats = 无效群聊
admin-clear-description-links = 用户名绑定（{$server}）
admin-clear-description-stats = 玩家统计缓存（{$server}）

admin-clear-preview-beatmaps = 当前缓存记录：{$count}
admin-clear-preview-images = 当前缓存：封面={$covers}，图片={$photos}
admin-clear-preview-chats = 将检查群聊：{$count}
admin-clear-preview-rows = 将删除记录：{$count}

admin-clear-all-servers = 所有服务器
admin-clear-button-menu = ⬅ 清理菜单
admin-clear-button-beatmaps = 🗂 清理谱面元数据缓存
admin-clear-button-links = 🧷 清理用户名绑定
admin-clear-button-images = 🖼 清理图片缓存
admin-clear-button-stats = 📊 清理玩家统计缓存
admin-clear-button-chats = 🧹 删除无效群聊
admin-clear-button-all-servers = 🌐 所有服务器
admin-clear-button-back = ⬅ 返回
admin-clear-button-confirm = ✅ 确认
