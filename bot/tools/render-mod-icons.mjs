import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const runtimeRequire = createRequire(path.join(process.cwd(), "render-mod-icons.cjs"));
const Canvas = runtimeRequire("@napi-rs/canvas");
const { OkiCardsGenerator } = runtimeRequire(
    path.join(process.cwd(), "build", "src", "presentation", "cards", "OkiCardsGenerator")
);

const normalCell = { width: 140, height: 110 };
const extendedCell = { width: 270, height: 110 };
const iconHeight = 70;
const iconWidth = 100;
const expectedExtendedWidth = 220;

function getAlphaBounds(context, width, height) {
    const pixels = context.getImageData(0, 0, width, height).data;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (pixels[(y * width + x) * 4 + 3] === 0) continue;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }
    }
    return maxX < 0 ? undefined : { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function hasExactColor(context, width, height, color) {
    const expected = [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16));
    const pixels = context.getImageData(0, 0, width, height).data;
    for (let offset = 0; offset < pixels.length; offset += 4) {
        if (
            pixels[offset] === expected[0] &&
            pixels[offset + 1] === expected[1] &&
            pixels[offset + 2] === expected[2] &&
            pixels[offset + 3] === 255
        ) {
            return true;
        }
    }
    return false;
}

function modList(acronym, extended) {
    return {
        toExtendedMods: () => [extended ? { acronym, rate: 1.25, settings: { speed_change: 1.25 } } : { acronym }],
    };
}

async function renderSheet(generator, icons, extended) {
    const columns = extended ? 4 : 8;
    const cell = extended ? extendedCell : normalCell;
    const rows = Math.ceil(icons.length / columns);
    const canvas = Canvas.createCanvas(columns * cell.width, rows * cell.height);
    const context = canvas.getContext("2d");
    context.fillStyle = "#18171c";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = "16px Torus";
    context.textAlign = "center";
    context.textBaseline = "middle";

    for (const [index, icon] of icons.entries()) {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const x = column * cell.width;
        const y = row * cell.height;
        const anchorX = extended ? x + cell.width - 12 : x + (cell.width + iconWidth) / 2;
        await generator.drawMods(context, modList(icon.acronym, extended), anchorX, y + 8, iconHeight, true);
        context.fillStyle = "#ffffff";
        context.fillText(icon.label, x + cell.width / 2, y + 94);
    }

    return canvas.toBuffer("image/png");
}

async function verifyIcon(generator, icon) {
    for (const height of [32, 50, iconHeight]) {
        const width = height / 0.7;
        const svg = await generator.getModAssetData(icon.acronym, width, height);
        const image = await Canvas.loadImage(svg);
        if (Math.abs(image.width - width) > 1 || Math.abs(image.height - height) > 1) {
            throw new Error(
                `${icon.label}: rendered ${image.width}x${image.height}, expected ${width.toFixed(2)}x${height}`
            );
        }

        const canvasWidth = Math.ceil(width);
        const normalCanvas = Canvas.createCanvas(canvasWidth, height);
        const normalContext = normalCanvas.getContext("2d");
        normalContext.drawImage(image, 0, 0, width, height);
        const normalBounds = getAlphaBounds(normalContext, canvasWidth, height);
        if (!normalBounds || normalBounds.width < Math.floor(width) - 2 || normalBounds.height < height - 2) {
            throw new Error(
                `${icon.label} at height ${height}: unexpected visible bounds ${JSON.stringify(normalBounds)}`
            );
        }
    }

    const extendedCanvas = Canvas.createCanvas(expectedExtendedWidth, iconHeight);
    const extendedContext = extendedCanvas.getContext("2d");
    await generator.drawMods(extendedContext, modList(icon.acronym, true), expectedExtendedWidth, 0, iconHeight, true);
    const extendedBounds = getAlphaBounds(extendedContext, expectedExtendedWidth, iconHeight);
    if (!extendedBounds || extendedBounds.width < expectedExtendedWidth - 2 || extendedBounds.height < 68) {
        throw new Error(`${icon.label} extended: unexpected visible bounds ${JSON.stringify(extendedBounds)}`);
    }
    if (!hasExactColor(extendedContext, expectedExtendedWidth, iconHeight, icon.extender)) {
        throw new Error(`${icon.label} extended: ${icon.extender} is not present in the render`);
    }
}

async function main() {
    globalThis.logger = {
        fatal(message) {
            throw message instanceof Error ? message : new Error(String(message));
        },
    };

    const assetsDirectory = path.join(process.cwd(), "build", "assets", "mods");
    const files = (await fs.readdir(assetsDirectory))
        .filter((fileName) => fileName.endsWith(".svg") && fileName !== "extended.svg")
        .sort((left, right) => left.localeCompare(right, "en", { numeric: true }));
    const icons = await Promise.all(
        files.map(async (fileName) => {
            const svg = await fs.readFile(path.join(assetsDirectory, fileName), "utf8");
            const root = svg.match(/<svg\s+([^>]*)>/i)?.[1] ?? "";
            const dimension = (name) => root.match(new RegExp(`\\b${name}="([^"]+)"`, "i"))?.[1];
            const width = dimension("width");
            const height = dimension("height");
            const viewBox = dimension("viewBox");
            const extender = dimension("data-extender");
            if (width !== "100" || height !== "70" || viewBox !== "0 0 100 70" || !extender) {
                throw new Error(`${fileName}: invalid root geometry or missing colour metadata`);
            }
            return {
                acronym: fileName.slice(0, -4),
                label: fileName === "NoMod.svg" ? "NM" : fileName.slice(0, -4),
                extender,
            };
        })
    );

    const generator = new OkiCardsGenerator();
    for (const icon of icons) {
        await verifyIcon(generator, icon);
    }

    await Promise.all([
        fs.writeFile(
            path.join(process.cwd(), "build", "mod-icons-normal.png"),
            await renderSheet(generator, icons, false)
        ),
        fs.writeFile(
            path.join(process.cwd(), "build", "mod-icons-extended.png"),
            await renderSheet(generator, icons, true)
        ),
    ]);
    console.log(`Verified ${icons.length} normal and extended mod icons.`);
}

await main();
