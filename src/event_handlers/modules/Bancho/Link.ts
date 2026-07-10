import axios from "axios";
import { ServerCommand } from "../../ServerCommand";
import { ServerModule } from "../Module";
import { APIUser } from "../../../Types";
import { isUserError } from "../../../UserError";

const buildVerifyUrl = (baseUrl: string): string => {
    const trimmed = baseUrl.replace(/\/+$/, "");
    if (trimmed.endsWith("/api/verify")) {
        return trimmed;
    }
    return `${trimmed}/api/verify`;
};

export default class BanchoLink extends ServerCommand {
    constructor(module: ServerModule) {
        super(["link", "nick", "n", "дштл", "т", "тшсл"], module, async (self) => {
            const linkApiUrl = process.env.OSU_LINK_API_URL?.trim();
            const linkPageUrl = process.env.OSU_LINK_PAGE_URL?.trim();

            if (!linkApiUrl) {
                if (!self.args.nickname[0]) {
                    await self.reply(
                        self.ctx.tr("nickname-not-specified", {
                            prefix: self.module.prefix[0],
                        })
                    );
                    return;
                }

                const api = self.module.api;
                if (!api.getUser) {
                    await self.reply(self.ctx.tr("unknown-error"));
                    return;
                }

                let user: APIUser;
                try {
                    user = await api.getUser(self.args.nickname.join(" "));
                } catch (error) {
                    if (isUserError(error, "user-not-found")) {
                        await self.reply(self.ctx.tr("user-not-found"));
                        return;
                    }
                    throw error;
                }

                await self.module.db.setNickname(self.ctx.senderId, user.id, user.nickname, user.mode);
                await self.reply(`${self.ctx.tr("nickname-set")}: ${user.nickname}`);
                return;
            }

            if (!self.args.full[0]) {
                const text = self.ctx.tr("link-code-not-specified-with-url", {
                    prefix: self.module.prefix[0],
                    url: linkPageUrl,
                });
                await self.reply(text);
                return;
            }

            let linkData: { user_id?: number | string; is_restrict?: boolean } | null = null;
            try {
                const verifyUrl = buildVerifyUrl(linkApiUrl);
                const response = await axios.get(verifyUrl, {
                    params: {
                        code: self.args.full[0],
                    },
                    timeout: 15000,
                });
                linkData = response.data;
            } catch (err) {
                if (axios.isAxiosError(err) && err.response && [400, 404, 410, 422].includes(err.response.status)) {
                    await self.reply(
                        self.ctx.tr("link-code-invalid", {
                            prefix: self.module.prefix[0],
                            url: linkPageUrl,
                        })
                    );
                } else {
                    await self.reply(self.ctx.tr("link-service-unavailable"));
                }
                return;
            }

            const userId = linkData?.user_id;
            if ((typeof userId !== "number" && typeof userId !== "string") || !String(userId).trim()) {
                await self.reply(
                    self.ctx.tr("link-code-invalid", {
                        prefix: self.module.prefix[0],
                        url: linkPageUrl,
                    })
                );
                return;
            }

            let user: APIUser;
            try {
                user = await self.module.api.getUserById(userId);
            } catch (error) {
                const responseKey = isUserError(error, "user-not-found")
                    ? "user-not-found"
                    : "link-service-unavailable";
                await self.reply(self.ctx.tr(responseKey));
                return;
            }

            await self.module.db.setNickname(self.ctx.senderId, user.id, user.nickname, user.mode);

            let replyText = `${self.ctx.tr("nickname-set")}: ${user.nickname}`;
            if (linkData?.is_restrict) {
                replyText += `\n${self.ctx.tr("link-restricted-warning")}`;
            }

            await self.reply(replyText);
        });
    }
}
