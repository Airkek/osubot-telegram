import { InlineKeyboard } from "grammy";
import { Command } from "../../Command";
import { Module } from "../Module";
import Util from "../../../Util";
import { ILocalisator } from "../../../ILocalisator";

interface IHelpPage {
    keyboard: InlineKeyboard;
    text: string;
}

type pageNames = "default" | "servers" | "prefixes" | "osucommands" | "basiccommands";

const button = (text: string, page: pageNames) => {
    return { text, command: `osu help ${page}` };
};

const buildPages = (l: ILocalisator): { [pageName in pageNames]: IHelpPage } => {
    return {
        default: {
            keyboard: Util.createKeyboard([
                [button(l.tr("osuservers-help-button"), "servers")],
                [button(l.tr("osucommands-help-button"), "osucommands")],
                [button(l.tr("basiccommands-help-button"), "basiccommands")],
            ]),
            text: l.tr("main-help-text"),
        },
        servers: {
            text: l.tr("osuservers-text"),
            keyboard: Util.createKeyboard([
                [button(l.tr("to-prefixes-help-button"), "prefixes")],
                [button(l.tr("home-page-button"), "default")],
            ]),
        },
        prefixes: {
            text: l.tr("serverprefixes-text"),
            keyboard: Util.createKeyboard([
                [button(l.tr("to-commands-help-button"), "osucommands")],
                [button(l.tr("previous-page-button"), "servers")],
                [button(l.tr("home-page-button"), "default")],
            ]),
        },
        osucommands: {
            text: l.tr("osucommands-text"),
            keyboard: Util.createKeyboard([
                [button(l.tr("osuservers-help-button"), "servers")],
                [button(l.tr("home-page-button"), "default")],
            ]),
        },
        basiccommands: {
            text: l.tr("basiccommands-text"),
            keyboard: Util.createKeyboard([[button(l.tr("home-page-button"), "default")]]),
        },
    };
};

export default class HelpCommand extends Command {
    constructor(module: Module) {
        super(["help", "хелп", "рудз", "помощь"], module, async (ctx, self, args) => {
            const arg = args.full[0];
            const pages = buildPages(ctx);
            let page: IHelpPage = pages["default"];
            if (arg && pages[arg]) {
                page = pages[arg];
            }

            if (ctx.messagePayload) {
                await ctx.edit(page.text, {
                    keyboard: page.keyboard,
                    dont_parse_links: false,
                });
                return;
            }

            await ctx.reply(page.text, {
                keyboard: page.keyboard,
                dont_parse_links: false,
            });
        });
    }
}
