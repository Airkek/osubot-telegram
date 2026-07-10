import { Command } from "../../Command";
import { Module, ServerModule } from "../Module";
import { IKeyboard } from "../../../Util";
import { ILocalisator } from "../../../ILocalisator";

interface IHelpPage {
    keyboard: IKeyboard;
    text: string;
}

type HelpPageId =
    | "home"
    | "start"
    | "syntax"
    | "osu_servers"
    | "vr_servers"
    | "main"
    | "simple"
    | "settings"
    | "admin"
    | `srv_${string}`;

const button = (text: string, page: HelpPageId): { text: string; command: string } => {
    return { text, command: `osu help ${page}` };
};

const slugify = (input: string): string => {
    return input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .replace(/_+/g, "_");
};

const formatPrefixes = (prefixes: string[]): string => {
    // Keep order (first is the canonical one), but remove duplicates.
    const uniq: string[] = [];
    for (const p of prefixes) {
        if (!uniq.includes(p)) {
            uniq.push(p);
        }
    }
    return uniq.join(", ");
};

const OSU_SERVER_ORDER: string[] = [
    "bancho",
    "gatari",
    "ripple",
    "ripple_relax",
    "akatsuki",
    "akatsuki_relax",
    "akatsuki_autopilot",
];

const VR_SERVER_ORDER: string[] = ["beatleader", "scoresaber"];

const normalizeLegacyPageId = (raw?: string): HelpPageId => {
    const arg = (raw ?? "").trim();
    if (!arg) {
        return "home";
    }

    // Backward-compatible aliases from the old help.
    if (arg === "default") return "home";
    if (arg === "servers") return "osu_servers";
    if (arg === "prefixes") return "osu_servers";
    if (arg === "osucommands") return "syntax";
    if (arg === "basiccommands") return "main";

    // Allow direct module slugs.
    if (arg.startsWith("srv_")) {
        return arg as HelpPageId;
    }

    return arg as HelpPageId;
};

const getServerModulesBySlugs = (modules: Module[], slugs: string[]): ServerModule[] => {
    // This page is category-specific (osu vs VR), so we only include the requested slugs.
    const serverModules = modules.filter((m): m is ServerModule => m instanceof ServerModule);
    const bySlug = new Map(serverModules.map((m) => [slugify(m.name), m] as const));

    const ordered: ServerModule[] = [];
    for (const slug of slugs) {
        const mod = bySlug.get(slug);
        if (mod) ordered.push(mod);
    }

    return ordered;
};

const getHelpKeyForCommand = (moduleName: string, commandName: string): string | null => {
    const cmd = commandName.toLowerCase();

    // Module-specific overrides first.
    if ((moduleName === "BeatLeader" || moduleName === "ScoreSaber") && cmd === "nick") {
        return "help-cmd-vr-nick";
    }

    if (moduleName === "Admin") {
        switch (cmd) {
            case "e":
                return "help-cmd-admin-error";
            case "ignore":
                return "help-cmd-admin-ignore";
            case "drop":
                return "help-cmd-admin-drop";
            case "notify":
                return "help-cmd-admin-notify";
            case "listfeature":
                return "help-cmd-admin-listfeature";
            case "enablefeature":
                return "help-cmd-admin-enablefeature";
            case "disablefeature":
                return "help-cmd-admin-disablefeature";
            case "clear":
                return "help-cmd-admin-clear";
        }
    }

    if (moduleName === "Main") {
        switch (cmd) {
            case "help":
                return "help-cmd-main-help";
            case "status":
                return "help-cmd-main-status";
            case "search":
                return "help-cmd-main-search";
            case "settings":
                return "help-cmd-main-settings";
            case "clear":
                return "help-cmd-main-clear";
            case "onboarding":
                return "help-cmd-main-onboarding";
            case "topcmds":
                return "help-cmd-main-topcmds";
        }
    }

    // Shared (mostly server) commands.
    switch (cmd) {
        case "link":
            return "help-cmd-link";
        case "nick":
            return "help-cmd-nick";
        case "id":
            return "help-cmd-id";
        case "mode":
            return "help-cmd-mode";
        case "user":
        case "u":
            return "help-cmd-user";
        case "recent":
        case "r":
            return "help-cmd-recent";
        case "top":
        case "t":
            return "help-cmd-top";
        case "compare":
        case "c":
            return "help-cmd-compare";
        case "leaderboard":
        case "lb":
            return "help-cmd-leaderboard";
        case "chat":
            return "help-cmd-chat";
        case "find":
            return "help-cmd-find";
        case "update":
            return "help-cmd-update";
        default:
            return null;
    }
};

const buildHomePage = (l: ILocalisator & { isFromOwner?: boolean }): IHelpPage => {
    const keyboard: IKeyboard = [
        [button(l.tr("help-start-button"), "start")],
        [button(l.tr("help-syntax-button"), "syntax")],
        [button(l.tr("help-osu-servers-button"), "osu_servers")],
        [button(l.tr("help-vr-servers-button"), "vr_servers")],
        [button(l.tr("help-main-button"), "main")],
        [button(l.tr("help-simple-button"), "simple")],
        [button(l.tr("help-settings-button"), "settings")],
    ];

    if (l.isFromOwner) {
        keyboard.push([button(l.tr("help-admin-button"), "admin")]);
    }

    return {
        text: l.tr("help-home-text"),
        keyboard,
    };
};

const buildStaticPage = (l: ILocalisator, textKey: string, backTo: HelpPageId = "home"): IHelpPage => {
    return {
        text: l.tr(textKey),
        keyboard: [[button(l.tr("previous-page-button"), backTo)], [button(l.tr("home-page-button"), "home")]],
    };
};

const buildServerListPage = (l: ILocalisator, modules: Module[], slugs: string[], titleKey: string): IHelpPage => {
    const servers = getServerModulesBySlugs(modules, slugs);

    const lines = servers.map((m) => {
        const prefixes = formatPrefixes(m.prefix);
        const link = m.link ? ` — ${m.link}` : "";
        return `• ${m.name} — ${prefixes}${link}`;
    });

    const text = `${l.tr(titleKey)}\n\n${lines.join("\n")}`;

    const keyboard: IKeyboard = servers.map((m) => {
        const slug = slugify(m.name);
        const label = `${m.name} (${m.prefix[0]})`;
        return [button(label, `srv_${slug}`)];
    });
    keyboard.push([button(l.tr("previous-page-button"), "home")]);
    keyboard.push([button(l.tr("home-page-button"), "home")]);

    return { text, keyboard };
};

const buildServerPage = (l: ILocalisator, modules: Module[], serverSlug: string): IHelpPage => {
    const server = modules.find((m): m is ServerModule => m instanceof ServerModule && slugify(m.name) === serverSlug);
    if (!server) {
        return buildStaticPage(l, "help-page-not-found", "home");
    }

    const icon = OSU_SERVER_ORDER.includes(serverSlug) ? "🌐" : VR_SERVER_ORDER.includes(serverSlug) ? "🎮" : "📦";

    const headerLines: string[] = [];
    headerLines.push(`${icon} ${server.name}`);
    if (server.link) {
        headerLines.push(`${l.tr("help-label-website")} ${server.link}`);
    }
    headerLines.push(`${l.tr("help-label-prefixes")} ${formatPrefixes(server.prefix)}`);

    const howToKey = VR_SERVER_ORDER.includes(serverSlug) ? "help-server-vr-howto" : "help-server-osu-howto";
    const howTo = l.tr(howToKey, {
        prefix: server.prefix[0],
    });

    const commandOrder = [
        "link",
        "nick",
        "id",
        "mode",
        "user",
        "recent",
        "top",
        "compare",
        "leaderboard",
        "chat",
        "find",
        "update",
    ];

    const commandsByName = new Map(server.commands.map((c) => [c.name, c] as const));

    const blocks: string[] = [];
    for (const cmdName of commandOrder) {
        if (!commandsByName.has(cmdName)) continue;
        const key = getHelpKeyForCommand(server.name, cmdName);
        if (!key) continue;
        blocks.push(
            l.tr(key, {
                prefix: server.prefix[0],
            })
        );
    }

    // Add unknown/new commands (short list) so help doesn't silently miss them.
    const described = new Set(commandOrder.filter((c) => commandsByName.has(c)));
    const extra = server.commands
        .filter((c) => !described.has(c.name))
        .sort((a, b) => a.name.localeCompare(b.name, "en"));

    if (extra.length) {
        const extraLines = extra.map((c) => {
            const aliases = c.prefixes.slice(1);
            return aliases.length ? `• ${c.name} (${aliases.join(", ")})` : `• ${c.name}`;
        });
        blocks.push(`${l.tr("help-unknown-commands-header")}\n${extraLines.join("\n")}`);
    }

    const notesKey = `help-notes-${serverSlug}`;
    const notes = l.tr(notesKey, {
        prefix: server.prefix[0],
    });

    const textParts = [headerLines.join("\n"), "", howTo, "", `${l.tr("help-label-commands")}\n${blocks.join("\n\n")}`];

    // If notes key is missing in locale, fluent often returns `{message-id}`; detect and skip.
    const missingNotesPlaceholder = `{${notesKey}}`;
    if (notes && notes.trim().length > 0 && notes !== notesKey && notes !== missingNotesPlaceholder) {
        textParts.push("", `${l.tr("help-label-notes")}\n${notes}`);
    }

    const text = textParts.join("\n").trim();

    const backTo: HelpPageId = VR_SERVER_ORDER.includes(serverSlug) ? "vr_servers" : "osu_servers";
    const keyboard: IKeyboard = [
        [button(l.tr("previous-page-button"), backTo)],
        [button(l.tr("home-page-button"), "home")],
    ];

    return { text, keyboard };
};

const buildModuleCommandsPage = (l: ILocalisator, module: Module, titleKey: string): IHelpPage => {
    const intro = l.tr(titleKey, {
        prefix: module.prefix[0] ?? "",
    });

    const knownOrder =
        module.name === "Admin"
            ? ["e", "ignore", "drop", "notify", "listfeature", "enablefeature", "disablefeature", "clear"]
            : ["help", "onboarding", "settings", "status", "search", "clear", "topcmds"];

    const byName = new Map(module.commands.map((c) => [c.name, c] as const));
    const blocks: string[] = [];

    for (const cmdName of knownOrder) {
        if (!byName.has(cmdName)) continue;
        const key = getHelpKeyForCommand(module.name, cmdName);
        if (!key) continue;
        blocks.push(
            l.tr(key, {
                prefix: module.prefix[0],
            })
        );
    }

    const text = `${intro}\n\n${l.tr("help-label-commands")}\n${blocks.join("\n\n")}`.trim();

    return {
        text,
        keyboard: [[button(l.tr("previous-page-button"), "home")], [button(l.tr("home-page-button"), "home")]],
    };
};

export default class HelpCommand extends Command {
    constructor(module: Module) {
        super(["help", "хелп", "рудз", "помощь"], module, async (ctx, self, args) => {
            const pageId = normalizeLegacyPageId(args.full[0]);
            const allModules = self.module.bot.modules;

            let page: IHelpPage;
            if (pageId === "home") {
                page = buildHomePage(ctx);
            } else if (pageId === "start") {
                page = buildStaticPage(ctx, "help-start-text");
            } else if (pageId === "syntax") {
                page = buildStaticPage(ctx, "help-syntax-text");
            } else if (pageId === "osu_servers") {
                page = buildServerListPage(ctx, allModules, OSU_SERVER_ORDER, "help-osu-servers-text");
            } else if (pageId === "vr_servers") {
                page = buildServerListPage(ctx, allModules, VR_SERVER_ORDER, "help-vr-servers-text");
            } else if (pageId === "main") {
                const mainModule = allModules.find((m) => m.name === "Main");
                page = mainModule
                    ? buildModuleCommandsPage(ctx, mainModule, "help-main-text")
                    : buildStaticPage(ctx, "help-page-not-found");
            } else if (pageId === "admin") {
                if (!ctx.isFromOwner) {
                    page = buildStaticPage(ctx, "help-admin-hidden");
                } else {
                    const adminModule = allModules.find((m) => m.name === "Admin");
                    page = adminModule
                        ? buildModuleCommandsPage(ctx, adminModule, "help-admin-text")
                        : buildStaticPage(ctx, "help-page-not-found");
                }
            } else if (pageId === "simple") {
                page = buildStaticPage(ctx, "help-simple-text");
            } else if (pageId === "settings") {
                page = buildStaticPage(ctx, "help-settings-text");
            } else if (pageId.startsWith("srv_")) {
                page = buildServerPage(ctx, allModules, pageId.slice(4));
            } else {
                page = buildHomePage(ctx);
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
