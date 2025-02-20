import { InlineKeyboard } from 'grammy';
import { Command } from '../../Command';
import { Module } from '../../Module';
import Util from '../../Util';

interface IHelpPage {
    keyboard: InlineKeyboard,
    text: string
}

type pageNames = 'default' | 'servers' | 'prefixes' | 'osucommands' | 'basiccommands'

const button = (text: string, page: pageNames) => {
    return {text, command: `osu help ${page}`};
};

const pages: {[pageName in pageNames]: IHelpPage} = {
    'default': {
        keyboard: Util.createKeyboard([
            [button('🌐 osu! servers', 'servers')],
            [button('📝 osu! commands', 'osucommands')], 
            [button('🔰 Basic commands', 'basiccommands')]
        ]),
        text: `Привет! 😊 Выберите, пожалуйста, раздел, по которому вы хотите получить помощь:

🌐 osu! servers - список осу серверов
📝 osu! commands - команды для серверов осу
🔰 Basic commands - базовые команды

Продвинутая версия помощи (больше информации): https://telegra.ph/Pomoshch-osu-bota-12-11`
    },
    'servers': {
        text: `Бот поддерживает несколько osu! серверов. Вот они:
• Bancho (официальный сервер osu!)
• Gatari
• Ripple
• Akatsuki
• Akatsuki!relax

Обращения к командам серверов происходит через префиксы. Пример команды сервера:
\`\`\`
s user mrekk
\`\`\`

Здесь "s" - префикс сервера (Bancho), "user" - команда сервера, "mrekk" - аргумент команды сервера`,
        keyboard: Util.createKeyboard([
            [button('Префиксы', 'prefixes')],
            [button('🏠 На главную', 'default')]
        ])
    },
    prefixes: {
        text: `Сервер - префикс:

• Bancho - s
• Gatari - g
• Ripple - r
• Akatsuki - a
• Akatsuki!relax - ax`,
        keyboard: Util.createKeyboard([
            [button('➡️ К командам', 'osucommands')],
            [button('⬅️ Назад', 'servers')],
            [button('🏠 На главную', 'default')]
        ])
    },
    osucommands: {
        text: `Команды osu!:
Знак вопроса (?) в аргументе означает что он необязателен
Фигурные скобки ({}) указаны только для наглядности, их писать не нужно
Команда {аргумент} - описание

Использование команды: {префикс сервера} {команда} {аргументы?}
Префикс сервера узнавать в разделе osu! servers

Команды:
• nick {username} - Установить ник
• mode {(osu|taiko|mania|fruits)} - Установить режим игры по умолчанию
• user {username?} - Информация о пользователе
• recent {username?} - Последний плей пользователя
• top {username?} - Топ-скоры пользователя
• chat - Топ игроков текущей беседы 
• leaderboard - Топ игроков текущей беседы на последней карте, которую видел бот
• compare {username?} - Скор игрока на последней карте, которую видел бот

⚠️Внимание! Прочитайте помощь по osu! серверам чтобы использовать эти команды!`,
        keyboard: Util.createKeyboard([
            [button('🌐 osu! servers', 'servers')],
            [button('🏠 На главную', 'default')]
        ])
    },
    basiccommands: {
        text: `Команды Basic модуля:
osu help - помощь
osu status - статус бота
osu uptime - аптайм бота
osu topcmds - топ использования команд
osu disable - выключить бота в чате (необходимо быть администратором чата)
osu enable - включить бота в чате (необходимо быть администратором чата)
osu clear - очистить топ чата от вышедших участников (необходимо быть администратором чата)`,
        keyboard: Util.createKeyboard([
            [button('🏠 На главную', 'default')]
        ])
    }
};

export default class HelpCommand extends Command {
    constructor(module: Module) {
        super(['help', 'хелп', 'рудз', 'помощь'], module, async (ctx, self, args) => {
            const arg = args.full[0];
            let page: IHelpPage = pages['default'];
            if (arg && pages[arg]) {
                page = pages[arg];
            }

            if (ctx.hasMessagePayload) {
                await ctx.edit(page.text, {keyboard: page.keyboard, dont_parse_links: false});
                return;
            }

            await ctx.reply(page.text, {keyboard: page.keyboard, dont_parse_links: false});
        });
    }
}
