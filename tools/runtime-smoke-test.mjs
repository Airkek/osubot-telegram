import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

const runtimeRequire = createRequire(path.join(process.cwd(), "runtime-smoke-test.cjs"));
const Canvas = runtimeRequire("@napi-rs/canvas");
const sharp = runtimeRequire("sharp");

async function main() {
    globalThis.logger = {
        fatal(message) {
            throw message instanceof Error ? message : new Error(String(message));
        },
    };

    const generatorPath = path.join(process.cwd(), "build", "src", "oki-cards", "OkiCardsGenerator");
    const { OkiCardsGenerator } = runtimeRequire(generatorPath);
    new OkiCardsGenerator();

    for (const family of ["Torus", "Mulish", "VarelaRound", "NotoSansSC"]) {
        if (!Canvas.GlobalFonts.has(family)) {
            throw new Error(`Font is not registered: ${family}`);
        }
    }

    const canvas = Canvas.createCanvas(160, 40);
    const context = canvas.getContext("2d");
    context.fillStyle = "#111";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#fff";
    context.font = "20px Torus";
    context.fillText("osu!", 4, 28);

    const canvasPng = canvas.toBuffer("image/png");
    if (!canvasPng.length) {
        throw new Error("Canvas PNG is empty");
    }

    const sharpPng = await sharp(canvasPng).resize(80, 20).png().toBuffer();
    if (!sharpPng.length) {
        throw new Error("Sharp PNG is empty");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
