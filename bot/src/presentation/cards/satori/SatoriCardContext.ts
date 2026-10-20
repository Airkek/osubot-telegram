import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { runtimePaths } from "application/RuntimePaths";
import { downloadRemoteImage } from "infrastructure/http/RemoteImage";

const IMAGE_TIMEOUT_MS = 4000;

// Рисуем в 2x: в Телеграме на телефоне карточка иначе мылится.
const RENDER_SCALE = 2;

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

/** Общая обвязка карточек на satori: шрифты, картинки и растеризация. */
export class SatoriCardContext {
    private fonts?: SatoriFont[];

    async toPng(element: React.ReactElement, width: number, height: number): Promise<Buffer> {
        const svg = await satori(element, { width, height, fonts: await this.loadFonts() });
        return Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: width * RENDER_SCALE } }).render().asPng());
    }

    /**
     * Картинки отдаются satori уже как data URI: если тянуть их по ссылке
     * внутри рендера, недоступная картинка роняет карточку целиком. Не
     * скачалось за таймаут — возвращаем undefined, компонент нарисует заглушку.
     *
     * Попутно приводим к PNG и ужимаем до нужной ширины: с серверов приходит
     * что угодно вплоть до webp, а инлайнить полноразмерный фон незачем.
     */
    async toDataUri(url: string | undefined, width: number): Promise<string | undefined> {
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
            global.logger.warn(`Failed to prepare a card image from ${url}`, error);
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
                global.logger.error(`Card font '${font.file}' is missing`, error);
                continue;
            }
            for (const weight of FONT_WEIGHTS) {
                loaded.push({ name: font.name, data, weight, style: "normal" } as SatoriFont);
            }
        }

        if (loaded.length === 0) {
            throw new Error("No fonts available for satori cards");
        }

        this.fonts = loaded;
        return loaded;
    }
}
