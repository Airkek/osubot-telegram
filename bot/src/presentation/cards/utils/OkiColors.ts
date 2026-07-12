import sharp from "sharp";

interface IColorContrast {
    colors: [RgbColor, RgbColor];
    ratio: number;
    readable: boolean;
    luminosity: [number, number];
}

type RgbColor = Array<number>;

export type HexColor = string;
interface IColors {
    foreground: HexColor;
    background: HexColor;
}

// Keep in sync with osu!web's public difficulty colour spectrum.
// https://github.com/ppy/osu-web/blob/5b148b8d65b39b693617e8f72bdfdd0cb101e486/resources/js/utils/beatmap-helper.ts
const difficultyColourStops: ReadonlyArray<readonly [number, HexColor]> = [
    [0.1, "#4290FB"],
    [1.25, "#4FC0FF"],
    [2, "#4FFFD5"],
    [2.5, "#7CFF4F"],
    [3.3, "#F6F05C"],
    [4.2, "#FF8068"],
    [4.9, "#FF4E6F"],
    [5.8, "#C645B8"],
    [6.7, "#6563DE"],
    [7.7, "#18158E"],
    [9, "#000000"],
];

// Keep in sync with osu!web's user level tiers.
// https://github.com/ppy/osu-web/blob/5b148b8d65b39b693617e8f72bdfdd0cb101e486/resources/js/components/user-level.tsx
// https://github.com/ppy/osu-web/blob/5b148b8d65b39b693617e8f72bdfdd0cb101e486/resources/css/layout.less
export function getUserLevelColours(level: number): readonly [HexColor, HexColor] {
    if (level >= 110) {
        return ["#FFE600", "#ED82FF"];
    }
    if (level >= 105) {
        return ["#97DCFF", "#ED82FF"];
    }
    if (level >= 100) {
        return ["#D9F8D3", "#A0CF96"];
    }
    if (level >= 80) {
        return ["#A8F0EF", "#52E0DF"];
    }
    if (level >= 60) {
        return ["#F0E4A8", "#E0C952"];
    }
    if (level >= 40) {
        return ["#E0E0EB", "#A3A3C2"];
    }
    if (level >= 20) {
        return ["#B88F7A", "#855C47"];
    }
    return ["#BAB3AB", "#BAB3AB"];
}

export function getDifficultyColour(starRating: number): HexColor {
    if (starRating < difficultyColourStops[0][0]) {
        return "#AAAAAA";
    }
    if (starRating >= difficultyColourStops[difficultyColourStops.length - 1][0]) {
        return difficultyColourStops[difficultyColourStops.length - 1][1];
    }

    const upperIndex = difficultyColourStops.findIndex(([rating]) => rating >= starRating);
    const [upperRating, upperColour] = difficultyColourStops[upperIndex];
    if (upperRating === starRating) {
        return upperColour;
    }

    const [lowerRating, lowerColour] = difficultyColourStops[upperIndex - 1];
    const progress = (starRating - lowerRating) / (upperRating - lowerRating);
    const gamma = 2.2;
    const lowerRgb = toRGB(lowerColour);
    const upperRgb = toRGB(upperColour);
    const interpolated = lowerRgb.map((channel, index) =>
        Math.round((channel ** gamma * (1 - progress) + upperRgb[index] ** gamma * progress) ** (1 / gamma))
    );
    return toHex(interpolated).toUpperCase();
}

export function getDifficultyIconColour(starRating: number): HexColor {
    return getWhiteIconBackgroundColour(getDifficultyColour(starRating));
}

export function getWhiteIconBackgroundColour(sourceColour: HexColor): HexColor {
    const colour = toRGB(sourceColour);
    const white = [255, 255, 255];
    if (getContrastRatio(white, colour).ratio >= 2) {
        return toHex(colour).toUpperCase();
    }

    for (let factor = 0.99; factor >= 0; factor -= 0.01) {
        const darkened = colour.map((channel) => Math.round(channel * factor));
        if (getContrastRatio(white, darkened).ratio >= 2) {
            return toHex(darkened).toUpperCase();
        }
    }

    return "#000000";
}

export function getColorBlack(colorHex: HexColor): boolean {
    const color = toRGB(colorHex);
    const red = color[0];
    const green = color[1];
    const blue = color[2];
    const brightness = (red * 299 + green * 587 + blue * 114) / 1000;
    return brightness <= 127;
}

function toHex(rgb: RgbColor): string {
    const componentToHex = (c: number) => {
        const hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    };

    return "#" + componentToHex(rgb[0]) + componentToHex(rgb[1]) + componentToHex(rgb[2]);
}

function toRGB(hex: HexColor): RgbColor {
    hex = hex.replace("#", "");
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

export async function getColors(image: Buffer): Promise<IColors> {
    const source = sharp(image, { limitInputPixels: 16_000_000 });
    const { dominant } = await source.clone().stats();
    const { r, g, b } = dominant;
    const dominantHex = toHex([r, g, b]);
    try {
        const { data, info } = await source
            .clone()
            .resize(64, 64, { fit: "inside", withoutEnlargement: true })
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        let vibrantColor: RgbColor = [r, g, b];
        let bestScore = -1;
        for (let offset = 0; offset < data.length; offset += info.channels) {
            if (data[offset + 3] < 128) {
                continue;
            }

            const pixel: RgbColor = [data[offset], data[offset + 1], data[offset + 2]];
            const max = Math.max(...pixel);
            const min = Math.min(...pixel);
            const saturation = max === 0 ? 0 : (max - min) / max;
            const lightness = (max + min) / 510;
            const score = saturation * (1 - Math.abs(lightness - 0.5));
            if (score > bestScore) {
                bestScore = score;
                vibrantColor = pixel;
            }
        }

        return {
            foreground: toHex(vibrantColor),
            background: dominantHex,
        };
    } catch {
        return toReadableContrastColors({
            foreground: dominantHex,
            background: dominantHex,
        });
    }
}

function getContrastRatio(foreground: RgbColor, background: RgbColor): IColorContrast {
    let R1 = foreground[0] / 255;
    let R2 = background[0] / 255;
    let G1 = foreground[1] / 255;
    let G2 = background[1] / 255;
    let B1 = foreground[2] / 255;
    let B2 = background[2] / 255;

    if (R1 <= 0.03928) {
        R1 = R1 / 12.92;
    } else {
        R1 = ((R1 + 0.055) / 1.055) ** 2.4;
    }

    if (R2 <= 0.03928) {
        R2 = R2 / 12.92;
    } else {
        R2 = ((R2 + 0.055) / 1.055) ** 2.4;
    }

    if (G1 <= 0.03928) {
        G1 = G1 / 12.92;
    } else {
        G1 = ((G1 + 0.055) / 1.055) ** 2.4;
    }

    if (G2 <= 0.03928) {
        G2 = G2 / 12.92;
    } else {
        G2 = ((G2 + 0.055) / 1.055) ** 2.4;
    }

    if (B1 <= 0.03928) {
        B1 = B1 / 12.92;
    } else {
        B1 = ((B1 + 0.055) / 1.055) ** 2.4;
    }

    if (B2 <= 0.03928) {
        B2 = B2 / 12.92;
    } else {
        B2 = ((B2 + 0.055) / 1.055) ** 2.4;
    }
    const L1 = 0.2126 * R1 + 0.7152 * G1 + 0.0722 * B1;
    const L2 = 0.2126 * R2 + 0.7152 * G2 + 0.0722 * B2;

    const threshold = 4;

    if (L1 > L2) {
        if ((L1 + 0.05) / (L2 + 0.05) < threshold) {
            return {
                colors: [foreground, background],
                ratio: (L1 + 0.05) / (L2 + 0.05),
                readable: false,
                luminosity: [L1, L2],
            };
        } else {
            return {
                colors: [foreground, background],
                ratio: (L1 + 0.05) / (L2 + 0.05),
                readable: true,
                luminosity: [L1, L2],
            };
        }
    } else {
        if ((L2 + 0.05) / (L1 + 0.05) < threshold) {
            return {
                colors: [foreground, background],
                ratio: (L2 + 0.05) / (L1 + 0.05),
                readable: false,
                luminosity: [L1, L2],
            };
        } else {
            return {
                colors: [foreground, background],
                ratio: (L2 + 0.05) / (L1 + 0.05),
                readable: true,
                luminosity: [L1, L2],
            };
        }
    }
}

export function toReadableContrastColors(scheme: IColors): IColors {
    const foreground = toRGB(scheme.foreground);
    const background = toRGB(scheme.background);
    let contrastRatioLight = getContrastRatio(foreground, background);
    let contrastRatioDark = getContrastRatio(foreground, background);
    let counter = 0;

    while (!contrastRatioLight.readable && !contrastRatioDark.readable) {
        counter++;
        contrastRatioLight = getContrastRatio(toRGB(brightness(toHex(foreground), counter)), background);
        contrastRatioDark = getContrastRatio(toRGB(brightness(toHex(foreground), -counter)), background);
    }

    return {
        background: toHex(background),
        foreground: toHex(contrastRatioLight.readable ? contrastRatioLight.colors[0] : contrastRatioDark.colors[0]),
    };
}

function brightness(color: string, percent: number) {
    const num = parseInt(color.replace("#", ""), 16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) + amt,
        B = ((num >> 8) & 0x00ff) + amt,
        G = (num & 0x0000ff) + amt;

    return (
        "#" +
        (
            0x1000000 +
            (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
            (B < 255 ? (B < 1 ? 0 : B) : 255) * 0x100 +
            (G < 255 ? (G < 1 ? 0 : G) : 255)
        )
            .toString(16)
            .slice(1)
    );
}
