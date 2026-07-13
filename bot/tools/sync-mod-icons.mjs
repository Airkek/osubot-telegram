import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const upstreamRoot = "https://raw.githubusercontent.com/ppy/osu-web/master";
const outputDirectory = path.join(process.cwd(), "assets", "mods");
const localUpstream = process.env.OSU_WEB_SOURCE_DIRECTORY;

const backgroundByType = {
    Automation: "#66CCFF",
    Conversion: "#8C66FF",
    DifficultyIncrease: "#FF6666",
    DifficultyReduction: "#B3FF66",
    Fun: "#FF66AB",
    System: "#FFCC22",
};

async function fetchText(relativePath) {
    if (localUpstream) {
        return fs.readFile(path.join(localUpstream, ...relativePath.split("/")), "utf8");
    }

    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const response = await fetch(`${upstreamRoot}/${relativePath}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.text();
        } catch (error) {
            lastError = error;
        }
    }
    throw new Error(`Failed to fetch ${relativePath}`, { cause: lastError });
}

function parseHex(color) {
    return [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16));
}

function toHex(channels) {
    return `#${channels.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function toLinear(channel) {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function fromLinear(channel) {
    const value = channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;
    return value * 255;
}

function mixWithBlack(color, amount, linear) {
    return toHex(
        parseHex(color).map((channel) => (linear ? fromLinear(toLinear(channel) * amount) : channel * amount))
    );
}

function recolor(svg, color) {
    return svg.replace(/(fill|stroke)=(['"])(?:white|#fff(?:fff)?)\2/gi, `$1="${color}"`);
}

function resizeRoot(svg, width, height) {
    return svg.replace(/<svg\s*([^>]*)>/i, (_match, attributes) => {
        const resizedAttributes = attributes
            .replace(/\s*(width|height)\s*=\s*(['"]).*?\2\s*/gi, " ")
            .replace(/\s+/g, " ")
            .trim();
        return `<svg width="${width}" height="${height}" ${resizedAttributes}>`;
    });
}

function composeIcon(backgroundSvg, glyphSvg, colors, sourcePath) {
    const background = resizeRoot(recolor(backgroundSvg, colors.background), 100, 70);
    const glyph = resizeRoot(recolor(glyphSvg, colors.foreground), 100, 70);

    return [
        `<svg width="100" height="70" viewBox="0 0 100 70" fill="none" xmlns="http://www.w3.org/2000/svg" data-background="${colors.background}" data-foreground="${colors.foreground}" data-extender="${colors.extender}">`,
        `<!-- Derived from ppy/osu-web/${sourcePath}. -->`,
        background,
        glyph,
        "</svg>",
        "",
    ].join("\n");
}

async function main() {
    const [modStyles, modDatabase, backgroundSvg, extenderSvg] = await Promise.all([
        fetchText("resources/css/bem/mod.less"),
        fetchText("database/mods.json").then(JSON.parse),
        fetchText("public/images/badges/mods/blanks/mod-icon.svg"),
        fetchText("public/images/badges/mods/blanks/mod-icon-extender.svg"),
    ]);

    const sourceByAcronym = new Map(
        [...modStyles.matchAll(/\.mod-icon-osu\(([^,]+),\s*([^)]+)\);/g)].map((match) => [
            match[1].trim(),
            `public/images/badges/mods/mod-${match[2].trim()}.svg`,
        ])
    );
    const typeByAcronym = new Map([["NM", "System"]]);
    for (const ruleset of modDatabase) {
        for (const mod of ruleset.Mods) {
            const existingType = typeByAcronym.get(mod.Acronym);
            if (existingType && existingType !== mod.Type) {
                throw new Error(`${mod.Acronym} has conflicting types: ${existingType} and ${mod.Type}`);
            }
            typeByAcronym.set(mod.Acronym, mod.Type);
        }
    }

    await fs.mkdir(outputDirectory, { recursive: true });
    const expectedFiles = new Set(["extended.svg"]);
    for (const [acronym, sourcePath] of sourceByAcronym) {
        const type = typeByAcronym.get(acronym);
        const background = backgroundByType[type];
        if (!background) {
            throw new Error(`No official colour mapping for ${acronym} (${type ?? "unknown type"})`);
        }

        const colors = {
            background,
            foreground: mixWithBlack(background, 0.1, true),
            extender: mixWithBlack(background, 0.263, false),
        };
        const glyphSvg = await fetchText(sourcePath);
        const fileName = acronym === "NM" ? "NoMod.svg" : `${acronym}.svg`;
        expectedFiles.add(fileName);
        await fs.writeFile(
            path.join(outputDirectory, fileName),
            composeIcon(backgroundSvg, glyphSvg, colors, sourcePath),
            "utf8"
        );
    }

    await fs.writeFile(path.join(outputDirectory, "extended.svg"), extenderSvg, "utf8");

    const existingFiles = await fs.readdir(outputDirectory);
    const staleFiles = existingFiles.filter((fileName) => fileName.endsWith(".svg") && !expectedFiles.has(fileName));
    if (staleFiles.length > 0) {
        throw new Error(`Unexpected stale mod icons: ${staleFiles.join(", ")}`);
    }

    console.log(`Updated ${sourceByAcronym.size} mod icons from ppy/osu-web.`);
}

await main();
