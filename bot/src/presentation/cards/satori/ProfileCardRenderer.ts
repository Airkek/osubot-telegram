import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs/promises";
import path from "node:path";
import { runtimePaths } from "application/RuntimePaths";
import { ILocalizer } from "localization/ILocalizer";
import { IGameUser } from "games/users/IGameUser";
import { IProfileCardLabels } from "presentation/cards/satori/IProfileCardLabels";
import { OsuProfileCard } from "presentation/cards/satori/OsuProfileCard";
import { downloadRemoteImage } from "infrastructure/http/RemoteImage";
import sharp from "sharp";

const CARD_WIDTH = 1000;
const CARD_HEIGHT = 400;

// Рисуем в 2x: в Телеграме на телефоне карточка иначе мылится.
const RENDER_SCALE = 2;

const IMAGE_TIMEOUT_MS = 4000;

// Ширины под 2x-рендер: больше смысла не имеет, меньше — мылит.
const BACKGROUND_WIDTH = CARD_WIDTH * RENDER_SCALE;
const AVATAR_WIDTH = 220;

// В ассетах лежит по одному начертанию на семейство, поэтому один и тот же
// файл регистрируется на все используемые веса — иначе satori не найдёт
// 800/900 и свалится на чужой шрифт.
const FONT_WEIGHTS = [400, 700, 800, 900] as const;

const FONT_FILES: Array<{ name: string; file: string }> = [
    { name: "Torus", file: "Torus.ttf" },
    { name: "Mulish", file: "Mulish.ttf" },
    { name: "NotoSansSC", file: "NotoSansSC-Regular.ttf" },
];

type SatoriFont = Parameters<typeof satori>[1]["fonts"][number];

export class ProfileCardRenderer {
    private fonts?: SatoriFont[];

    async render(user: IGameUser, l: ILocalizer, serverName: string): Promise<Buffer> {
        const [avatar, background] = await Promise.all([
            this.toDataUri(user.profileAvatarUrl, AVATAR_WIDTH),
            this.toDataUri(user.profileBackgroundUrl, BACKGROUND_WIDTH),
        ]);

        const svg = await satori(
            OsuProfileCard({
                user,
                labels: this.labels(l),
                serverName,
                avatar,
                background,
            }),
            { width: CARD_WIDTH, height: CARD_HEIGHT, fonts: await this.loadFonts() }
        );

        return Buffer.from(
            new Resvg(svg, { fitTo: { mode: "width", value: CARD_WIDTH * RENDER_SCALE } }).render().asPng()
        );
    }

    private labels(l: ILocalizer): IProfileCardLabels {
        return {
            globalRank: l.tr("card-global-rank"),
            countryRank: l.tr("card-country-rank"),
            accuracy: l.tr("card-accuracy"),
            playcount: l.tr("card-playcount"),
            playtime: l.tr("card-playtime"),
            level: l.tr("card-level"),
            supporter: l.tr("card-supporter"),
            hour: l.tr("card-hour-short"),
            minute: l.tr("card-minute-short"),
        };
    }

    /**
     * Картинки отдаются satori уже как data URI: если тянуть их по ссылке
     * внутри рендера, недоступная аватарка роняет карточку целиком. Не
     * скачалось за таймаут — возвращаем undefined, компонент нарисует заглушку.
     *
     * Попутно приводим к PNG и ужимаем до нужной ширины: с сервера приходит
     * что угодно вплоть до webp, а инлайнить полноразмерный фон незачем.
     */
    private async toDataUri(url: string | undefined, width: number): Promise<string | undefined> {
        if (!url) {
            return undefined;
        }
        try {
            const image = await Promise.race([
                downloadRemoteImage(url),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error("image download timed out")), IMAGE_TIMEOUT_MS)
                ),
            ]);
            if (!image?.length) {
                return undefined;
            }
            const png = await sharp(image)
                .resize({ width, withoutEnlargement: true })
                .png({ compressionLevel: 6 })
                .toBuffer();
            return `data:image/png;base64,${png.toString("base64")}`;
        } catch (error) {
            global.logger.warn(`Failed to prepare a profile card image from ${url}`, error);
            return undefined;
        }
    }

    private async loadFonts(): Promise<SatoriFont[]> {
        if (this.fonts) {
            return this.fonts;
        }

        const loaded: SatoriFont[] = [];
        for (const font of FONT_FILES) {
            let data: Buffer;
            try {
                data = await fs.readFile(path.join(runtimePaths.assets, font.file));
            } catch (error) {
                global.logger.error(`Profile card font '${font.file}' is missing`, error);
                continue;
            }
            for (const weight of FONT_WEIGHTS) {
                loaded.push({ name: font.name, data, weight, style: "normal" } as SatoriFont);
            }
        }

        if (loaded.length === 0) {
            throw new Error("No fonts available for the profile card");
        }

        this.fonts = loaded;
        return loaded;
    }
}
