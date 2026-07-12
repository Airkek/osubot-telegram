import type { ServerCommand } from "commands/ServerCommand";
import { ServerModule } from "commands/ServerModule";
import { ICommandArgs } from "commands/ICommandArgs";
import { IMessageContext } from "core/IMessageContext";
import { ISendOptions } from "core/ISendOptions";
import { IGameUserLink } from "games/users/IGameUserLink";
import { ILocalizer } from "localization/ILocalizer";

interface ParsedUser {
    username?: string;
    id?: string;
    dbUser: IGameUserLink;
}

export class CommandContext {
    readonly name: string | string[];
    readonly module: ServerModule;
    readonly ctx: IMessageContext;
    readonly args: ICommandArgs;
    readonly isPayload: boolean;
    user: ParsedUser;

    constructor(command: ServerCommand, ctx: IMessageContext, args: ICommandArgs) {
        this.ctx = ctx;
        this.args = args;
        this.name = command.name;
        this.module = command.module;
        this.isPayload = !!ctx.messagePayload;
    }

    private addServerToText(text: string, localizer: ILocalizer): string {
        return `${localizer.tr("server-name", {
            server: this.module.name,
        })}\n${text}`;
    }

    async reply(text: string, options?: ISendOptions): Promise<void> {
        await this.ctx.reply(this.addServerToText(text, this.ctx), options);
    }

    async send(text: string, options?: ISendOptions, replyTo?: number): Promise<unknown> {
        return await this.ctx.send(this.addServerToText(text, this.ctx), options, replyTo);
    }

    async edit(text: string, options?: ISendOptions): Promise<void> {
        return await this.ctx.edit(this.addServerToText(text, this.ctx), options);
    }

    async answer(text: string): Promise<true | void> {
        return await this.ctx.answer(text);
    }

    async acknowledge(): Promise<void> {
        await this.ctx.acknowledge();
    }
}
