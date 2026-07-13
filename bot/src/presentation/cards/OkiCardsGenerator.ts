import { IPerformanceRequest } from "games/osu/performance/IPerformanceRequest";
import { IGameScore } from "games/scores/IGameScore";
import { IGameUser } from "games/users/IGameUser";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import Canvas, { GlobalFonts, SKRSContext2D } from "@napi-rs/canvas";
import * as OkiColors from "presentation/cards/utils/OkiColors";
import * as OkiFormat from "presentation/cards/utils/OkiFormat";
import { ILocalizer } from "localization/ILocalizer";
import { Util } from "shared/Util";
import { IBeatmap } from "games/IBeatmap";
import { BanchoPerformanceCalculator } from "games/osu/performance/bancho/BanchoPerformanceCalculator";
import { OsuBeatmap } from "games/osu/beatmaps/OsuBeatmap";
import { Mods } from "games/osu/performance/Mods";
import { BeatLeaderBeatmap } from "games/beatsaber/beatmaps/BeatLeaderBeatmap";
import { ScoreSaberBeatmap } from "games/beatsaber/beatmaps/ScoreSaberBeatmap";
import { downloadRemoteImage } from "infrastructure/http/RemoteImage";
import { resolveScorePp, shouldDisplayPpEstimate } from "games/osu/performance/PPDisplay";
import { runtimePaths } from "application/RuntimePaths";
import { IScorePpDisplay } from "games/osu/performance/IScorePpDisplay";
import { ILeaderboardResult } from "games/leaderboards/ILeaderboardResult";

type CountryCodes = {
    [key: string]: string;
};

type CompactScoreRowLayout = {
    scoreX: number;
    scoreWidth: number;
    detailsX: number;
    detailsWidth: number;
    identityX: number;
    maxCombo: number;
};

export class OkiCardsGenerator {
    private readonly assetsDirectory: string;
    private countryCodes: CountryCodes;
    private flagsInited: boolean = false;

    constructor() {
        this.assetsDirectory = runtimePaths.assets;

        this.registerFontSync("Torus.ttf", "Torus");
        this.registerFontSync("Mulish.ttf", "Mulish");
        this.registerFontSync("VarelaRound.ttf", "VarelaRound");
        this.registerFontSync("NotoSansSC-Regular.ttf", "NotoSansSC");
    }

    private async getCountryName(countryCode: string): Promise<string> {
        if (!this.flagsInited) {
            try {
                const data = await fs.readFile(this.getAssetPath("country_codes.json"), "utf8");
                this.countryCodes = JSON.parse(data);
                this.flagsInited = true;
            } catch (err) {
                global.logger.fatal(`failed to get country code names: ${err}`);
                return "Unknown";
            }
        }

        return this.countryCodes[countryCode] || "Unknown";
    }

    private registerFontSync(assetName: string, fontName: string) {
        const font = this._getAssetDataSync(assetName);
        if (font) {
            GlobalFonts.register(font, fontName);
        } else {
            global.logger.fatal(`'${fontName}' register failed: '${assetName}' not found`);
        }
    }

    private getAssetPath(assetName: string): string {
        return path.join(this.assetsDirectory, assetName);
    }

    private getModAssetPath(modAcronym: string): string {
        let realAcronym = modAcronym;
        const aliases = {
            K1: "1K",
            K2: "2K",
            K3: "3K",
            K4: "4K",
            K5: "5K",
            K6: "6K",
            K7: "7K",
            K8: "8K",
            K9: "9K",
            K10: "10K",
            V2: "SV2",
        };

        if (aliases[modAcronym]) {
            realAcronym = aliases[modAcronym];
        }

        return this.getAssetPath(path.join("mods", realAcronym + ".svg"));
    }

    private async getAssetDataByPath(path: string): Promise<Buffer> {
        try {
            const file = await fs.readFile(path);
            return Buffer.from(file);
        } catch {
            return undefined;
        }
    }

    private async getAssetData(assetName: string): Promise<Buffer> {
        const path = this.getAssetPath(assetName);
        return this.getAssetDataByPath(path);
    }

    private _getAssetDataByPathSync(path: string): Buffer {
        if (!fsSync.existsSync(path)) {
            return undefined;
        }
        return Buffer.from(fsSync.readFileSync(path));
    }

    private _getAssetDataSync(assetName: string): Buffer {
        const path = this.getAssetPath(assetName);
        return this._getAssetDataByPathSync(path);
    }

    private async getModAssetData(modAcronym: string, width: number, height: number): Promise<Buffer> {
        const path = this.getModAssetPath(modAcronym);
        return await this.getSvgAssetByPath(path, width, height);
    }

    private getFlagAssetPath(countryCode: string): string {
        return this.getAssetPath(path.join("flags", `${countryCode}.svg`));
    }

    private async getFlagAssetData(countryCode: string): Promise<Buffer> {
        const flag = await this.getSvgAssetByPath(this.getFlagAssetPath(countryCode), 36, 36);
        return flag || this.getAssetDataByPath(this.getAssetPath(path.join("flags", "XX.png")));
    }

    private async getModeAssetData(mode: number, colour: string, width: number, height: number): Promise<Buffer> {
        let modeIconAsset: string = undefined;
        switch (mode) {
            case 0:
                modeIconAsset = "mode_osu";
                break;
            case 1:
                modeIconAsset = "mode_taiko";
                break;
            case 2:
                modeIconAsset = "mode_fruits";
                break;
            case 3:
                modeIconAsset = "mode_mania";
                break;

            default:
                return undefined;
        }

        const icon = await this.getSvgAsset(modeIconAsset, width, height);
        return icon ? Buffer.from(icon.toString("utf8").replaceAll("#FFFFFF", colour)) : undefined;
    }

    private async getGradeAssetData(grade: string): Promise<Buffer> {
        let gradeIconAsset: string = undefined;
        switch (grade?.toLowerCase()) {
            case "a":
                gradeIconAsset = "grade_a";
                break;
            case "b":
                gradeIconAsset = "grade_b";
                break;
            case "c":
                gradeIconAsset = "grade_c";
                break;
            case "d":
                gradeIconAsset = "grade_d";
                break;
            case "f":
                gradeIconAsset = "grade_f";
                break;
            case "s":
                gradeIconAsset = "grade_s";
                break;
            case "s+":
            case "sh":
                gradeIconAsset = "grade_sh";
                break;
            case "x":
            case "ss":
                gradeIconAsset = "grade_ss";
                break;
            case "x+":
            case "xh":
            case "ssh":
            case "ss+":
                gradeIconAsset = "grade_ssh";
                break;

            default:
                return undefined;
        }

        return this.getSvgAsset(gradeIconAsset, 320, 160);
    }

    private async getUserLevelAssetData(level: number, width: number, height: number): Promise<Buffer> {
        const icon = await this.getSvgAsset("user_level", width, height);
        if (!icon) {
            return undefined;
        }

        const [topColour, bottomColour] = OkiColors.getUserLevelColours(level);
        return Buffer.from(
            icon.toString("utf8").replace("#LEVEL_TOP#", topColour).replace("#LEVEL_BOTTOM#", bottomColour)
        );
    }

    private extractModSvgColors(input: string | Buffer): {
        background: string;
        foreground: string;
        extender: string;
    } {
        const s = input instanceof Buffer ? input.toString("utf-8") : (input as string);

        const metadata = {
            background: s.match(/\bdata-background="([^"]+)"/i)?.[1],
            foreground: s.match(/\bdata-foreground="([^"]+)"/i)?.[1],
            extender: s.match(/\bdata-extender="([^"]+)"/i)?.[1],
        };
        if (metadata.background && metadata.foreground && metadata.extender) {
            return metadata;
        }

        const attrRe = /(fill|stroke)\s*=\s*(['"])(.*?)\2/gi;

        const found: { type: "fill" | "stroke"; value: string; index: number }[] = [];

        let m: RegExpExecArray | null;
        while ((m = attrRe.exec(s)) !== null) {
            const attr = m[1].toLowerCase() as "fill" | "stroke";
            const val = m[3].trim();
            const idx = m.index;

            if (!val) continue;
            if (val.toLowerCase() === "none") continue;

            found.push({ type: attr, value: val, index: idx });
        }

        if (found.length === 0) return undefined;

        found.sort((a, b) => a.index - b.index);

        const firstFill = found.find((f) => f.type === "fill");
        const background = firstFill ? firstFill.value : found[0].value;

        const bgIndex = found.findIndex((f) => f.value === background);
        let foreground: string | undefined;

        const strokeAfter = found.slice(bgIndex + 1).find((f) => f.type === "stroke");
        if (strokeAfter) {
            foreground = strokeAfter.value;
        } else {
            const nextAfter = found[bgIndex + 1];
            if (nextAfter) foreground = nextAfter.value;
        }

        if (!foreground) {
            const anyStroke = found.find((f) => f.type === "stroke");
            if (anyStroke && anyStroke.value !== background) foreground = anyStroke.value;
        }

        if (!foreground) return undefined;

        return {
            background,
            foreground,
            extender: foreground,
        };
    }

    private async drawMods(
        ctx: SKRSContext2D,
        mods: Mods,
        firstModX: number,
        posY: number,
        height: number,
        toLeft: boolean = true
    ) {
        const oldFont = ctx.font;
        const oldAlignment = ctx.textAlign;
        const oldColor = ctx.fillStyle;
        const oldBaseline = ctx.textBaseline;

        const width = height / 0.7;
        const extenderWidth = height * (155 / 70);
        const extenderOverlap = height / 2;
        const extendedMods = mods.toExtendedMods();
        if (extendedMods.length > 0) {
            let cursorX = firstModX;
            const orderedMods = toLeft ? [...extendedMods].reverse() : extendedMods;
            for (const mod of orderedMods) {
                const asset = await this.getModAssetData(mod.acronym, width, height);
                if (!asset) {
                    continue;
                }

                let colors: ReturnType<OkiCardsGenerator["extractModSvgColors"]> = undefined;
                if (mod.rate !== undefined) {
                    colors = this.extractModSvgColors(asset);
                }

                const hasExtender = colors !== undefined;
                const unitWidth = hasExtender ? width + extenderWidth - extenderOverlap : width;
                const posX = toLeft ? cursorX - unitWidth : cursorX;

                if (hasExtender) {
                    const extendedAsset = await this.getColoredSvgAssetByPath(
                        this.getModAssetPath("extended"),
                        colors.extender,
                        extenderWidth,
                        height
                    );
                    const extenderX = posX + width - extenderOverlap;
                    const extImage = await Canvas.loadImage(extendedAsset);
                    ctx.drawImage(extImage, extenderX, posY, extenderWidth, height);

                    ctx.fillStyle = colors.background;
                    ctx.font = `bold ${height / 1.8}px Torus`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    const visibleExtenderWidth = extenderWidth - extenderOverlap;
                    const textX = posX + width + visibleExtenderWidth / 2 - height * (1.5 / 70);
                    const textY = posY + height / 2;
                    ctx.fillText(`${mod.rate.toFixed(2)}x`, textX, textY);
                }

                const image = await Canvas.loadImage(asset);
                ctx.drawImage(image, posX, posY, width, height);
                cursorX = toLeft ? posX : posX + unitWidth;
            }
        }

        ctx.font = oldFont;
        ctx.textAlign = oldAlignment;
        ctx.fillStyle = oldColor;
        ctx.textBaseline = oldBaseline;
    }

    private async getColoredSvgAsset(
        svgFileNameWithoutExtension: string,
        color: string,
        width: number,
        height: number
    ): Promise<Buffer> {
        const assetPath = this.getAssetPath(`${svgFileNameWithoutExtension}.svg`);
        return this.getColoredSvgAssetByPath(assetPath, color, width, height);
    }

    private async getColoredSvgAssetByPath(
        assetPath: string,
        color: string,
        width: number,
        height: number
    ): Promise<Buffer> {
        let svgFile = await this._getSvgAssetInternal(assetPath, width, height);
        if (!svgFile) {
            return undefined;
        }
        svgFile = svgFile.replace(/fill="[#.a-zA-Z0-9]+"/g, `fill="${color}"`);
        return Buffer.from(svgFile);
    }

    private async getSvgAssetByPath(assetPath: string, width: number, height: number): Promise<Buffer> {
        const svgFile = await this._getSvgAssetInternal(assetPath, width, height);
        if (!svgFile) {
            return undefined;
        }
        return Buffer.from(svgFile);
    }

    private async getSvgAsset(svgFileNameWithoutExtension: string, width: number, height: number): Promise<Buffer> {
        const assetPath = this.getAssetPath(`${svgFileNameWithoutExtension}.svg`);
        return this.getSvgAssetByPath(assetPath, width, height);
    }

    private async _getSvgAssetInternal(assetPath: string, width: number, height: number): Promise<string> {
        try {
            let svgFile = await fs.readFile(assetPath, "utf8");

            const svgTagRegex = /<svg\s*([^>]*)>/;

            svgFile = svgFile.replace(svgTagRegex, (_match, attributes: string) => {
                let newAttributes = attributes
                    .replace(/\s*(width|height)\s*=\s*(['"]).*?\2\s*/gi, " ")
                    .replace(/\s*(width|height)\s*=\s*[^'"\s]+\s*/gi, " ")
                    .replace(/\s+/g, " ")
                    .trim();

                if (!/\bpreserveAspectRatio\s*=/i.test(newAttributes)) {
                    newAttributes = `preserveAspectRatio="xMidYMid meet" ${newAttributes}`.trim();
                }

                return `<svg width="${width}" height="${height}" ${newAttributes}>`;
            });

            return svgFile;
        } catch {
            return undefined;
        }
    }

    private async loadImageFromUrl(url: string): Promise<Buffer> {
        try {
            return await downloadRemoteImage(url);
        } catch {
            return undefined;
        }
    }

    private async drawFullBeatmap(
        ctx: SKRSContext2D,
        beatmap: IBeatmap,
        compact: boolean = false
    ): Promise<{
        foreground: string;
        background: string;
    }> {
        let coverBuffer = await this.loadImageFromUrl(beatmap.coverUrl);
        if (!coverBuffer) {
            coverBuffer = await this.getAssetData("unknown_bg.png");
        }

        const colorBase = await OkiColors.getColors(coverBuffer);
        const color = OkiColors.toReadableContrastColors(colorBase);

        const isActiveColorDark = OkiColors.getColorBlack(color.background);
        let mainColor = color.foreground;
        const accentColor = "#ffffff";
        if (compact) {
            mainColor = accentColor;
        }

        ctx.fillStyle = color.background;
        OkiFormat.rect(ctx, 0, 0, ctx.canvas.width, ctx.canvas.height, 0);

        const beatmapImage = await Canvas.loadImage(coverBuffer);
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 20;
        ctx.save();
        OkiFormat.rect(ctx, 0, 0, ctx.canvas.width, 300, 0);
        ctx.clip();

        ctx.drawImage(beatmapImage, 0, 0, ctx.canvas.width, 300);

        if (compact) {
            if (isActiveColorDark) {
                ctx.globalCompositeOperation = "multiply";
                ctx.fillStyle = "rgb(100, 100, 100)";
                ctx.globalAlpha = 0.1;
                ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.globalCompositeOperation = "source-over";
                ctx.globalAlpha = 1;
            } else {
                ctx.fillStyle = "rgb(100, 100, 100)";
                ctx.globalAlpha = 0.3;
                ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.globalCompositeOperation = "source-over";
                ctx.globalAlpha = 1;
            }
        }

        ctx.restore();
        ctx.shadowBlur = 0;

        const statusWidth = 186;
        const statusPosX = 24;
        const statusPosY = 20;
        // status
        ctx.beginPath();
        ctx.fillStyle = "#3333338C";
        OkiFormat.rect(ctx, statusPosX, statusPosY, statusWidth, 46, 26);
        ctx.fillStyle = color.foreground;
        OkiFormat.rect(ctx, statusPosX, statusPosY, 46, 46, 26);
        ctx.font = "20px Mulish, NotoSansSC";
        ctx.textAlign = "center";
        ctx.fillStyle = accentColor;
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1;
        ctx.fillText(beatmap.status, 127, 51);
        ctx.strokeText(beatmap.status, 127, 51);

        const statusAsset = await this.getAssetData(`${beatmap.status.toLowerCase()}.png`);
        if (statusAsset) {
            const statusImage = await Canvas.loadImage(statusAsset);
            ctx.drawImage(statusImage, 37, 33, 20, 20);
        }

        ctx.fillStyle = mainColor;
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 2;

        const titlePosY = compact ? statusPosY + 86 : 367;
        const artistPosY = titlePosY + 39;
        const titleArtisPosX = 40;

        ctx.font = "42px VarelaRound";
        ctx.textAlign = "left";
        ctx.fillText(beatmap.title, titleArtisPosX, titlePosY);
        ctx.strokeText(beatmap.title, titleArtisPosX, titlePosY);

        ctx.font = "26px VarelaRound";
        ctx.lineWidth = 1;
        ctx.fillText(beatmap.artist, titleArtisPosX, artistPosY);
        ctx.strokeText(beatmap.artist, titleArtisPosX, artistPosY);
        const artistTextWidth = ctx.measureText(beatmap.artist).width;

        const statsPosX = compact ? titleArtisPosX : 40;
        const statsRectPosX = statsPosX + 44;
        const statsRectWidth = 284;
        const statsTextPosX = statsRectPosX + statsRectWidth + 18;

        const statsPosY = compact ? artistPosY + 12 : 459;
        const statsPosTextY = statsPosY + 22;
        const statsPosRectY = statsPosY + 7;

        const statsPosYAddition = 36;

        let statsRendered = false;
        if (beatmap instanceof OsuBeatmap) {
            statsRendered = true;
            const csVal = beatmap.stats.cs.toFixed(1);
            const arVal = beatmap.stats.ar.toFixed(1);
            const hpVal = beatmap.stats.hp.toFixed(1);
            const odVal = beatmap.stats.od.toFixed(1);
            ctx.fillStyle = mainColor;
            ctx.strokeStyle = mainColor;
            ctx.font = "22px VarelaRound";
            ctx.fillText("CS", statsPosX, statsPosTextY);
            ctx.strokeText("CS", statsPosX, statsPosTextY);
            ctx.fillText("AR", statsPosX, statsPosTextY + statsPosYAddition);
            ctx.strokeText("AR", statsPosX, statsPosTextY + statsPosYAddition);
            ctx.fillText("HP", statsPosX, statsPosTextY + statsPosYAddition * 2);
            ctx.strokeText("HP", statsPosX, statsPosTextY + statsPosYAddition * 2);
            ctx.fillText("OD", statsPosX, statsPosTextY + statsPosYAddition * 3);
            ctx.strokeText("OD", statsPosX, statsPosTextY + statsPosYAddition * 3);
            ctx.fillText(csVal, statsTextPosX, statsPosTextY);
            ctx.strokeText(csVal, statsTextPosX, statsPosTextY);
            ctx.fillText(arVal, statsTextPosX, statsPosTextY + statsPosYAddition);
            ctx.strokeText(arVal, statsTextPosX, statsPosTextY + statsPosYAddition);
            ctx.fillText(hpVal, statsTextPosX, statsPosTextY + statsPosYAddition * 2);
            ctx.strokeText(hpVal, statsTextPosX, statsPosTextY + statsPosYAddition * 2);
            ctx.fillText(odVal, statsTextPosX, statsPosTextY + statsPosYAddition * 3);
            ctx.strokeText(odVal, statsTextPosX, statsPosTextY + statsPosYAddition * 3);
            ctx.beginPath();
            ctx.fillStyle = mainColor + "31";
            OkiFormat.rect(ctx, statsRectPosX, statsPosRectY, statsRectWidth, 13, 7);
            OkiFormat.rect(ctx, statsRectPosX, statsPosRectY + statsPosYAddition, statsRectWidth, 13, 7);
            OkiFormat.rect(ctx, statsRectPosX, statsPosRectY + statsPosYAddition * 2, statsRectWidth, 13, 7);
            OkiFormat.rect(ctx, statsRectPosX, statsPosRectY + statsPosYAddition * 3, statsRectWidth, 13, 7);
            ctx.beginPath();
            ctx.fillStyle = mainColor;
            OkiFormat.rect(
                ctx,
                statsRectPosX,
                statsPosRectY,
                (statsRectWidth / 10) * Math.min(beatmap.stats.cs > 0 ? beatmap.stats.cs : 0.5, 10),
                13,
                7
            );
            OkiFormat.rect(
                ctx,
                statsRectPosX,
                statsPosRectY + statsPosYAddition,
                (statsRectWidth / 10) * Math.min(beatmap.stats.ar > 0 ? beatmap.stats.ar : 0.5, 10),
                13,
                7
            );
            OkiFormat.rect(
                ctx,
                statsRectPosX,
                statsPosRectY + statsPosYAddition * 2,
                (statsRectWidth / 10) * Math.min(beatmap.stats.hp > 0 ? beatmap.stats.hp : 0.5, 10),
                13,
                7
            );
            OkiFormat.rect(
                ctx,
                statsRectPosX,
                statsPosRectY + statsPosYAddition * 3,
                (statsRectWidth / 10) * Math.min(beatmap.stats.od > 0 ? beatmap.stats.od : 0.5, 10),
                13,
                7
            );

            if (!compact) {
                let mapperPfpBuffer = await this.loadImageFromUrl(`https://a.ppy.sh/${beatmap.authorId}`);
                if (!mapperPfpBuffer) {
                    mapperPfpBuffer = await this.getAssetData("avatar-guest.png");
                }
                const mapperPfp = await Canvas.loadImage(mapperPfpBuffer);
                ctx.save();
                OkiFormat.rect(ctx, 478, 466, 91, 91, 16);
                ctx.clip();
                ctx.drawImage(mapperPfp, 478, 466, 91, 91);
                ctx.restore();
            }
        }

        let timeVal: number = undefined;
        let bpmVal: number = undefined;
        let starsVal: number = undefined;
        if (
            beatmap instanceof OsuBeatmap ||
            beatmap instanceof BeatLeaderBeatmap ||
            beatmap instanceof ScoreSaberBeatmap
        ) {
            if (beatmap instanceof OsuBeatmap || beatmap instanceof BeatLeaderBeatmap) {
                timeVal = beatmap.stats.length;
                bpmVal = beatmap.stats.bpm;
            }

            starsVal = beatmap.stats.stars;
        }
        ctx.textAlign = "left";
        ctx.font = "27px VarelaRound";
        const time = timeVal ? Util.formatBeatmapLength(timeVal) : undefined;
        const timeWidth = time ? ctx.measureText(time).width : 0;
        const maxCombo = beatmap.maxCombo ? beatmap.maxCombo + "x" : undefined;
        const maxComboWidth = maxCombo ? ctx.measureText(maxCombo).width : 0;
        const bpm = bpmVal ? bpmVal.toFixed(0) + " bpm" : undefined;

        const clockX = compact ? statusPosX + statusWidth + 16 : 600;
        const clockTextX = clockX + 40;
        const chainX = time ? clockTextX + timeWidth + 15 : clockX;
        const chainTextX = chainX + 40;
        const drumX = maxCombo ? chainTextX + maxComboWidth + 15 : chainX;
        const drumTextX = drumX + 42;

        const mapRegularInfoY = compact ? statusPosY + 34 : 412 + 30;

        if (time) {
            const clockAsset = await this.getColoredSvgAsset("clock", mainColor, 38, 38);
            if (clockAsset) {
                const clock = await Canvas.loadImage(clockAsset);
                ctx.drawImage(clock, clockX, mapRegularInfoY - 29, 38, 38);
            }

            ctx.fillText(time, clockTextX, mapRegularInfoY);
            ctx.strokeText(time, clockTextX, mapRegularInfoY);
        }

        if (maxCombo) {
            const chainAsset = await this.getColoredSvgAsset("chain", mainColor, 38, 38);
            if (chainAsset) {
                const chain = await Canvas.loadImage(chainAsset);
                ctx.drawImage(chain, chainX, mapRegularInfoY - 29, 38, 38);
            }
            ctx.fillText(maxCombo, chainTextX, mapRegularInfoY);
            ctx.strokeText(maxCombo, chainTextX, mapRegularInfoY);
        }

        if (bpm) {
            const drumAsset = await this.getColoredSvgAsset("drum", mainColor, 40, 35);
            if (drumAsset) {
                const drum = await Canvas.loadImage(drumAsset);
                ctx.drawImage(drum, drumX, mapRegularInfoY - 29, 40, 35);
            }

            ctx.fillText(bpm, drumTextX, mapRegularInfoY);
            ctx.strokeText(bpm, drumTextX, mapRegularInfoY);
        }

        const starsPosX = compact && statsRendered ? statsTextPosX + 80 : statsPosX;
        const starsPosY = compact ? statsPosY + statsPosYAddition : 420;
        const starsMargin = 18;
        const starWidth = 33;
        let starsMaxWidth = 0;
        if (starsVal) {
            const starAsset = await this.getColoredSvgAsset("star", mainColor, 28, 27);
            if (starAsset) {
                const star = await Canvas.loadImage(starAsset);
                if (starsVal > 10) {
                    for (let i = 0; i < 10; i++) {
                        ctx.drawImage(star, starsPosX + starWidth * i, starsPosY, 28, 27);
                    }
                    starsMaxWidth = starWidth * 10;
                } else {
                    let i = 0;
                    for (; i < Math.floor(starsVal); i++) {
                        ctx.drawImage(star, starsPosX + starWidth * i, starsPosY, 28, 27);
                        starsMaxWidth += starWidth;
                    }
                    const lastStarSize = starsVal - Math.floor(starsVal);
                    if (lastStarSize > 0) {
                        const minSize = 0.5;
                        const multiplier = minSize + (1 - minSize) * lastStarSize;
                        starsMaxWidth += starWidth * multiplier;

                        const miniStarW = 28 * multiplier;
                        const miniStarH = 27 * multiplier;

                        const miniStarAsset = await this.getColoredSvgAsset("star", mainColor, miniStarW, miniStarH);
                        if (miniStarAsset) {
                            const miniStar = await Canvas.loadImage(miniStarAsset);
                            ctx.drawImage(
                                miniStar,
                                starsPosX + starWidth * i + (28 - 28 * multiplier) / 2,
                                starsPosY + (27 - 27 * multiplier) / 2,
                                miniStarW,
                                miniStarH
                            );
                        }
                    }
                }
            }

            if (!compact) {
                starsMaxWidth = starWidth * 10;
            }

            const starsText = starsVal.toFixed(2);
            ctx.fillStyle = mainColor;
            ctx.strokeStyle = mainColor;
            ctx.font = "22px VarelaRound";
            ctx.fillText(starsText, starsPosX + starsMaxWidth + starsMargin, starsPosY + 25);
            ctx.strokeText(starsText, starsPosX + starsMaxWidth + starsMargin, starsPosY + 25);
        }

        let diffPosX = compact ? starsPosX : titleArtisPosX + artistTextWidth + 24;
        const diffPosY = compact ? statsPosTextY : artistPosY;
        if (beatmap instanceof OsuBeatmap && beatmap.mode >= 0 && beatmap.mode <= 3) {
            const stars = beatmap.stats.stars;
            const difficultyColour = OkiColors.getDifficultyIconColour(stars);
            const diffIconAsset = await this.getModeAssetData(beatmap.mode, "#FFFFFF", 32, 32);
            if (diffIconAsset) {
                const diffIcon = await Canvas.loadImage(diffIconAsset);
                const diffIconCenterX = diffPosX + 16;
                const diffIconCenterY = diffPosY - 10;
                ctx.save();
                ctx.beginPath();
                ctx.fillStyle = difficultyColour;
                ctx.arc(diffIconCenterX, diffIconCenterY, 14, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                ctx.drawImage(diffIcon, diffPosX, diffPosY - 26, 32, 32);
            }

            diffPosX += 36;
        }

        ctx.textAlign = "left";
        ctx.font = "26px VarelaRound";
        const version = beatmap.version;
        ctx.fillText(version, diffPosX, diffPosY);
        ctx.strokeText(version, diffPosX, diffPosY);
        const diffWidth = ctx.measureText(version).width;

        const mapperNameX = compact ? diffPosX + diffWidth + 16 : 523;
        const mapperNameY = compact ? diffPosY : 581;
        ctx.font = "21px VarelaRound";
        ctx.textAlign = compact ? "left" : "center";
        const authorText = compact ? `by ${beatmap.author}` : beatmap.author;
        ctx.fillText(authorText, mapperNameX, mapperNameY);
        ctx.strokeText(authorText, mapperNameX, mapperNameY);

        await this.drawMods(ctx, beatmap.currentMods, ctx.canvas.width - 12, 240, 50);

        return color;
    }

    private drawRows(
        ctx: SKRSContext2D,
        startPosY: number,
        centerX: number,
        textColor: string,
        textSize: number,
        valSize: number,
        fieldSpacing: number,
        verticalRowSpacing: number,
        fieldVerticalMargin: number,
        fieldHorizontalMargin: number,
        fieldRadius: number,
        fieldToValSpacing: number,
        rows: {
            text: string;
            value: string;
        }[][]
    ) {
        const oldFont = ctx.font;
        const oldAlignment = ctx.textAlign;
        const oldColor = ctx.fillStyle;
        const oldBaseline = ctx.textBaseline;

        const textFont = `${textSize}px Mulish, NotoSansSC`;
        const valFont = `bold ${valSize}px Torus`;

        const fieldHeight = textSize + fieldVerticalMargin * 2;

        const measureField = (text: string, value: string) => {
            ctx.textAlign = "center";

            ctx.font = textFont;
            const keyMeasure = ctx.measureText(text);

            ctx.font = valFont;
            const valMeasure = ctx.measureText(value);

            return Math.max(keyMeasure.width, valMeasure.width) + fieldHorizontalMargin * 2;
        };

        rows.forEach((fields, rowIndex) => {
            const totalWidth =
                fields.reduce((sum, field) => sum + measureField(field.text, field.value), 0) +
                fieldSpacing * (fields.length - 1);

            let x = centerX - totalWidth / 2;

            fields.forEach((field) => {
                const fieldWidth = measureField(field.text, field.value);
                const posY = startPosY + (fieldHeight + valSize + fieldToValSpacing + verticalRowSpacing) * rowIndex;

                ctx.fillStyle = textColor + "21";
                OkiFormat.rect(ctx, x, posY, fieldWidth, fieldHeight, fieldRadius);

                ctx.fillStyle = textColor;

                ctx.font = textFont;
                ctx.textBaseline = "middle";
                ctx.fillText(field.text, x + fieldWidth / 2, posY + fieldHeight / 2);

                ctx.font = valFont;
                ctx.textBaseline = "top";
                ctx.fillText(field.value, x + fieldWidth / 2, posY + fieldHeight + fieldToValSpacing);

                x += fieldWidth + fieldSpacing;
            });
        });

        ctx.font = oldFont;
        ctx.textAlign = oldAlignment;
        ctx.fillStyle = oldColor;
        ctx.textBaseline = oldBaseline;
    }

    async generateScoreCard(score: IGameScore, beatmap: IBeatmap, l: ILocalizer): Promise<Buffer> {
        const canvas = Canvas.createCanvas(1080, 610);
        const ctx = canvas.getContext("2d");

        const colors = await this.drawFullBeatmap(ctx, beatmap, true);
        const isActiveColorDark = OkiColors.getColorBlack(colors.background);
        let accentColor: string;
        if (isActiveColorDark) {
            accentColor = "#ffffff";
        } else {
            accentColor = "#000000";
        }

        const mainColor = accentColor;

        let scoreByCenter = false;
        const gradeAsset = await this.getGradeAssetData(score.rank);
        const padding = 200;
        const gradeSize = [140, 70];
        const baseScoreGradePosY = score.top100_number ? 320 : 335;
        if (gradeAsset) {
            const gradeImage = await Canvas.loadImage(gradeAsset);
            ctx.drawImage(
                gradeImage,
                canvas.width - gradeSize[0] - padding,
                baseScoreGradePosY,
                gradeSize[0],
                gradeSize[1]
            );
        } else if (score.rank) {
            ctx.font = "80px Mulish";
            ctx.fillStyle = accentColor;
            ctx.textBaseline = "middle";
            ctx.textAlign = "right";
            ctx.fillText(score.rank, canvas.width - padding, baseScoreGradePosY + gradeSize[1] / 2);
        } else {
            scoreByCenter = true;
        }

        ctx.font = "80px Torus";
        ctx.fillStyle = colors.foreground;
        ctx.textBaseline = "middle";
        ctx.textAlign = scoreByCenter ? "center" : "left";
        ctx.fillText(
            score.score.toLocaleString(),
            scoreByCenter ? canvas.width / 2 : padding,
            baseScoreGradePosY + gradeSize[1] / 2
        );

        if (score.rank_global && score.rank_global < 1000000) {
            ctx.font = "60px Torus";
            ctx.fillStyle = accentColor + "40";
            ctx.textAlign = "right";
            ctx.textBaseline = "bottom";
            ctx.fillText("#" + score.rank_global.toLocaleString(), canvas.width - 40, canvas.height - 10);
        }

        if (score.top100_number) {
            ctx.font = "24px VarelaRound, NotoSansSC";
            ctx.fillStyle = accentColor;
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            ctx.fillText(l.tr("personal_top_score", { number: score.top100_number }), canvas.width / 2, 430);
        }

        const gradeProgress =
            score.rank === "F"
                ? ((score.counts.totalHits() / beatmap.hitObjectsCount) * 100).toFixed(1) + "%"
                : undefined;

        const pp = await resolveScorePp(score, new BanchoPerformanceCalculator(beatmap, score.mods));

        const rows = [
            [
                {
                    text: l.tr("score-accuracy"),
                    value: (score.accuracy() * 100).toFixed(2) + "%",
                },
                {
                    text: l.tr("score-combo"),
                    value: Util.formatCombo(score.combo, beatmap.maxCombo),
                },
                ...(pp.actual !== undefined ? [{ text: "PP", value: pp.actual.toFixed(2) }] : []),
                ...(shouldDisplayPpEstimate(pp.actual, pp.calculated, pp.fc)
                    ? [{ text: "FC", value: pp.fc!.toFixed(2) }]
                    : []),
                ...(shouldDisplayPpEstimate(pp.actual, pp.calculated, pp.ss)
                    ? [{ text: "SS", value: pp.ss!.toFixed(2) }]
                    : []),
            ],
            [
                ...score.counts.getCountNames(l).map((c) => {
                    return {
                        text: c.name,
                        value: c.value?.toLocaleString() ?? "0",
                    };
                }),
                ...(gradeProgress ? [{ text: l.tr("score-failed-at"), value: gradeProgress }] : []),
            ],
        ];

        this.drawRows(ctx, 440, canvas.width / 2, mainColor, 26, 32, 12, 6, 6, 16, 20, 8, rows);

        return canvas.toBuffer("image/png");
    }

    async generateBeatmapInfoCard(beatmap: IBeatmap): Promise<Buffer> {
        const canvas = Canvas.createCanvas(1080, 620);
        const ctx = canvas.getContext("2d");

        const color = await this.drawFullBeatmap(ctx, beatmap);

        if (beatmap instanceof OsuBeatmap) {
            const calc = new BanchoPerformanceCalculator(beatmap, beatmap.currentMods);
            const hits = beatmap.hitObjectsCount;

            // Удаляем args и задаем фиксированные значения для расчета PP
            const ppValues = [
                { acc: 0.95, label: "95%" },
                { acc: 0.98, label: "98%" },
                { acc: 0.99, label: "99%" },
                { acc: 1.0, label: "100%" },
            ];

            ctx.fillStyle = color.foreground;
            ctx.strokeStyle = color.foreground;
            ctx.textAlign = "left";
            ctx.font = "30px VarelaRound, NotoSansSC";

            let yPosition = 459 + 22; // Начальная позиция по Y

            for (const item of ppValues) {
                const ppArgs = Util.createPPArgs(
                    {
                        acc: item.acc,
                        combo: beatmap.maxCombo, // Максимальное комбо
                        hits,
                        miss: 0, // Без миссов
                        mods: beatmap.currentMods,
                        counts: { 50: 0 }, // Без 50
                    },
                    beatmap.mode
                );

                const pp = await calc.calculate(ppArgs);
                const ppText = `${item.label}: ${pp.pp.toFixed(2)}pp`;

                ctx.fillText(ppText, 629, yPosition);
                ctx.strokeText(ppText, 629, yPosition);

                yPosition += 36; // Отступ между строками
            }
        }

        return canvas.toBuffer("image/png");
    }

    async generateBeatmapPPCard(beatmap: IBeatmap, l: ILocalizer, args?: IPerformanceRequest): Promise<Buffer> {
        const canvas = Canvas.createCanvas(1080, 620);
        const ctx = canvas.getContext("2d");

        const color = await this.drawFullBeatmap(ctx, beatmap);

        if (beatmap instanceof OsuBeatmap) {
            // pp
            const calc = new BanchoPerformanceCalculator(beatmap, beatmap.currentMods);
            const ppArgs = Util.createPPArgs(args, beatmap.mode);
            const pp = await calc.calculate(ppArgs);

            ctx.fillStyle = color.foreground;
            ctx.strokeStyle = color.foreground;
            ctx.textAlign = "left";
            ctx.font = "30px VarelaRound, NotoSansSC";

            const accText = l.tr("score-accuracy") + ": ";
            const accWidth = ctx.measureText(accText).width;
            ctx.fillText(accText, 629, 459 + 22);
            ctx.strokeText(accText, 629, 459 + 22);

            const accVal = (ppArgs.acc * 100).toFixed(2) + "%";
            ctx.fillText(accVal, 629 + accWidth, 459 + 22);
            ctx.strokeText(accVal, 629 + accWidth, 459 + 22);

            const comboText = l.tr("score-combo") + ": ";
            const comboWidth = ctx.measureText(comboText).width;
            ctx.fillText(comboText, 629, 495 + 22);
            ctx.strokeText(comboText, 629, 495 + 22);

            const comboVal = Util.formatCombo(ppArgs.combo, beatmap.maxCombo);
            ctx.fillText(comboVal, 629 + comboWidth, 495 + 22);
            ctx.strokeText(comboVal, 629 + comboWidth, 495 + 22);

            const missText = l.tr("score-misses") + ": ";
            const missWidth = ctx.measureText(missText).width;
            ctx.fillText(missText, 629, 531 + 22);
            ctx.strokeText(missText, 629, 531 + 22);

            const missVal = ppArgs.counts.hitData.miss.toString();
            ctx.fillText(missVal, 629 + missWidth, 531 + 22);
            ctx.strokeText(missVal, 629 + missWidth, 531 + 22);

            const ppText = "pp: ";
            const ppWidth = ctx.measureText(ppText).width;
            ctx.fillText(ppText, 629, 567 + 22);
            ctx.strokeText(ppText, 629, 567 + 22);

            const ppVal = pp.pp.toFixed(2);
            ctx.fillText(ppVal, 629 + ppWidth, 567 + 22);
            ctx.strokeText(ppVal, 629 + ppWidth, 567 + 22);
        }

        return canvas.toBuffer("image/png");
    }

    private async drawScoreListRow(
        ctx: SKRSContext2D,
        score: IGameScore,
        title: string,
        accentLabel: string,
        secondaryLabel: string,
        startY: number,
        pp: IScorePpDisplay,
        countryCode?: string,
        place?: number,
        compactLayout?: CompactScoreRowLayout
    ): Promise<void> {
        const compact = compactLayout !== undefined;
        const rowMargin = 45;
        ctx.fillStyle = "#54454C";
        OkiFormat.rect(ctx, rowMargin, startY, ctx.canvas.width - rowMargin * 2, 52, 10);

        const rankAsset = await this.getGradeAssetData(score.rank);
        if (rankAsset) {
            const rankImage = await Canvas.loadImage(rankAsset);
            ctx.drawImage(rankImage, rowMargin + 12, startY + 13.5, 49, 25);
        }

        ctx.textAlign = "left";
        ctx.font = "20px Mulish";
        ctx.fillStyle = "#ffffff";

        const titleY = startY + (compact ? 33 : 23);
        let titleX = 120;
        if (compactLayout) {
            ctx.fillStyle = "#46393f";
            OkiFormat.rect(ctx, compactLayout.scoreX, startY, compactLayout.scoreWidth, 52, 8);
            ctx.textAlign = "center";
            ctx.font = "bold 18px Torus";
            ctx.fillStyle = "#ffffff";
            ctx.fillText(
                score.score.toLocaleString("en-US"),
                compactLayout.scoreX + compactLayout.scoreWidth / 2,
                startY + 33
            );

            ctx.fillStyle = "#46393f";
            OkiFormat.rect(ctx, compactLayout.detailsX, startY, compactLayout.detailsWidth, 52, 8);
            ctx.font = "bold 15px Torus";
            ctx.fillStyle = "#FFCC22";
            ctx.fillText(
                Util.formatCombo(score.combo, compactLayout.maxCombo),
                compactLayout.detailsX + compactLayout.detailsWidth / 2,
                startY + 21
            );
            ctx.font = "12px Mulish";
            ctx.fillStyle = "rgb(163, 143, 152)";
            ctx.fillText(score.counts.toString(), compactLayout.detailsX + compactLayout.detailsWidth / 2, startY + 41);

            ctx.textAlign = "left";
            ctx.font = "20px Mulish";
            ctx.fillStyle = "#ffffff";
            titleX = compactLayout.identityX;
        }
        if (place !== undefined) {
            const placeLabel = `#${place}`;
            ctx.fillText(placeLabel, titleX, titleY);
            titleX += ctx.measureText(placeLabel).width + 10;
        }
        if (countryCode) {
            const flagAsset = await this.getFlagAssetData(countryCode.toUpperCase());
            if (flagAsset) {
                const flag = await Canvas.loadImage(flagAsset);
                const flagY = startY + (compact ? 16 : 4);
                if (flag.width === 36 && flag.height === 36) {
                    ctx.drawImage(flag, 0, 5, 36, 26, titleX, flagY, 30, 20);
                } else {
                    ctx.drawImage(flag, titleX, flagY, 30, 20);
                }
                titleX += 40;
            }
        }

        const visibleTitle = OkiFormat.truncate(compact ? 18 : 55, title);
        ctx.fillText(visibleTitle, titleX, titleY);

        if (compact) {
            const titleWidth = ctx.measureText(visibleTitle).width;
            ctx.font = "15px Mulish";
            ctx.fillStyle = "rgb(163, 143, 152)";
            ctx.fillText(secondaryLabel, titleX + titleWidth + 20, titleY);
        } else {
            ctx.font = "15px Torus";
            ctx.fillStyle = "rgb(255, 204, 34)";
            ctx.fillText(accentLabel, 120, startY + 40);
            const accentLabelWidth = ctx.measureText(accentLabel).width;

            ctx.font = "15px Mulish";
            ctx.fillStyle = "rgb(163, 143, 152)";
            ctx.fillText(secondaryLabel, 120 + accentLabelWidth + 20, startY + 40);
        }

        if (pp.actual !== undefined) {
            const ppPanelX = ctx.canvas.width - rowMargin - 125;
            ctx.fillStyle = "#46393f";
            OkiFormat.rect(ctx, ppPanelX, startY, 125, 52, 10);

            let ppX = ppPanelX + 10;
            let ppY = startY + 20;
            const fcPp = shouldDisplayPpEstimate(pp.actual, pp.calculated, pp.fc) ? pp.fc : undefined;
            if (fcPp === undefined) {
                ppX += 10;
                ppY += 15;
            }

            ctx.font = "bold 20px Torus";
            ctx.fillStyle = "#FF66AB";
            const realPpText = Util.round(pp.actual, 2).toString();
            ctx.fillText(realPpText, ppX, ppY);
            const realPpWidth = ctx.measureText(realPpText).width;

            ctx.font = "bold 14px Torus";
            ctx.fillStyle = "#D194AF";
            ctx.fillText("pp", ppX + realPpWidth + 2, ppY);

            if (fcPp !== undefined) {
                ctx.font = "italic 20px Torus";
                ctx.fillStyle = "#D194AF";
                const fcPpDelimiterText = "/ ";
                ctx.fillText(fcPpDelimiterText, ppX + 10, ppY + 25);
                const fcPpDelimiterWidth = ctx.measureText(fcPpDelimiterText).width;

                ctx.fillStyle = "#FF66AB";
                const fcPpText = Util.round(fcPp, 2).toString();
                ctx.fillText(fcPpText, ppX + 10 + fcPpDelimiterWidth, ppY + 25);
                const fcPpTextWidth = ctx.measureText(fcPpText).width;

                ctx.font = "italic 14px Torus";
                ctx.fillStyle = "#D194AF";
                ctx.fillText("pp", ppX + fcPpTextWidth + fcPpDelimiterWidth + 12, ppY + 25);
            }
        }

        ctx.font = "bold 20px Torus";
        ctx.fillStyle = "#FFCC22";
        const accuracyX = ctx.canvas.width - rowMargin - 205;
        ctx.fillText(`${(score.accuracy() * 100).toFixed(2)}%`, accuracyX, startY + 35);

        await this.drawMods(ctx, score.mods, accuracyX - 15, startY + 10, 32);
    }

    private measureLeaderboardRowLayout(ctx: SKRSContext2D, leaderboard: ILeaderboardResult): CompactScoreRowLayout {
        ctx.font = "bold 18px Torus";
        const scoreTextWidth = Math.max(
            ...leaderboard.scores.map((entry) => ctx.measureText(entry.score.score.toLocaleString("en-US")).width),
            0
        );

        ctx.font = "bold 15px Torus";
        const comboTextWidth = Math.max(
            ...leaderboard.scores.map(
                (entry) => ctx.measureText(Util.formatCombo(entry.score.combo, leaderboard.map.maxCombo)).width
            ),
            0
        );
        ctx.font = "12px Mulish";
        const hitCountsTextWidth = Math.max(
            ...leaderboard.scores.map((entry) => ctx.measureText(entry.score.counts.toString()).width),
            0
        );

        const scoreX = 112;
        const scoreWidth = Math.max(96, Math.ceil(scoreTextWidth) + 20);
        const detailsX = scoreX + scoreWidth + 4;
        const detailsWidth = Math.max(100, Math.ceil(Math.max(comboTextWidth, hitCountsTextWidth)) + 16);

        return {
            scoreX,
            scoreWidth,
            detailsX,
            detailsWidth,
            identityX: detailsX + detailsWidth + 12,
            maxCombo: leaderboard.map.maxCombo,
        };
    }

    async generateTopScoresCard(
        scores: IGameScore[],
        maps: IBeatmap[],
        user: IGameUser,
        l: ILocalizer
    ): Promise<Buffer> {
        const canvas = Canvas.createCanvas(1200, 450);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#2a2226";
        OkiFormat.rect(ctx, 0, 0, canvas.width, canvas.height, 0);

        ctx.textAlign = "left";
        ctx.font = "50px Torus, VarelaRound, NotoSansSC";
        ctx.fillStyle = "#ffffff";
        const header = l.tr("best-scores-header");
        ctx.fillText(header, 40, 60);
        const headerMetrics = ctx.measureText(header);

        ctx.font = "32px Mulish, NotoSansSC";
        ctx.fillStyle = "rgb(163, 143, 152)";
        ctx.fillText(
            l.tr("best-scores-subheader", {
                player_name: user.nickname,
                date: Util.formatDate(new Date()),
            }),
            40 + headerMetrics.width + 10,
            60
        );

        for (let i = 0; i < scores.length; i++) {
            const score = scores[i];
            const beatmap = maps[i];
            const pp = await resolveScorePp(score, new BanchoPerformanceCalculator(beatmap, score.mods));
            await this.drawScoreListRow(
                ctx,
                score,
                beatmap.title,
                beatmap.version,
                Util.formatDate(score.date),
                90 + i * 60,
                pp
            );
        }

        return canvas.toBuffer("image/png");
    }

    async generateLeaderboardCard(
        leaderboard: ILeaderboardResult,
        l: ILocalizer,
        startNumber: number
    ): Promise<Buffer> {
        const canvas = Canvas.createCanvas(1200, 450);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#2a2226";
        OkiFormat.rect(ctx, 0, 0, canvas.width, canvas.height, 0);

        ctx.textAlign = "left";
        ctx.font = "50px Torus, VarelaRound, NotoSansSC";
        ctx.fillStyle = "#ffffff";
        const header = l.tr("leaderboard-card-header");
        ctx.fillText(header, 40, 55);

        ctx.font = "16px Mulish, NotoSansSC";
        ctx.fillStyle = "rgb(163, 143, 152)";
        const map = leaderboard.map;
        const subheader = l.tr("leaderboard-card-subheader", {
            artist: map.artist,
            title: map.title,
            difficulty: map.version,
        });
        ctx.fillText(subheader, 40, 84);
        const rowLayout = this.measureLeaderboardRowLayout(ctx, leaderboard);

        for (let i = 0; i < leaderboard.scores.length; i++) {
            const entry = leaderboard.scores[i];
            const actualPp = Number.isFinite(entry.score.pp) ? entry.score.pp : undefined;
            await this.drawScoreListRow(
                ctx,
                entry.score,
                entry.user.nickname,
                map.version,
                Util.formatDate(entry.score.date, true),
                105 + i * 60,
                { actual: actualPp },
                entry.country,
                startNumber + i,
                rowLayout
            );
        }

        return canvas.toBuffer("image/png");
    }

    async generateUserCard(user: IGameUser, l: ILocalizer): Promise<Buffer> {
        const canvas = Canvas.createCanvas(1200, user.rankedPlay ? 816 : 624);
        const ctx = canvas.getContext("2d");

        let background: Buffer = undefined;
        let avatar: Buffer = undefined;

        if (user.profileBackgroundUrl) {
            background = await this.loadImageFromUrl(user.profileBackgroundUrl);
        }
        if (!background) {
            background = await this.getAssetData("unknown_bg.png");
        }

        if (user.profileAvatarUrl) {
            avatar = await this.loadImageFromUrl(user.profileAvatarUrl);
        }
        if (!avatar) {
            avatar = await this.getAssetData("avatar-guest.png");
        }

        if (!background || !avatar) {
            return undefined;
        }

        const colors = await OkiColors.getColors(background);

        const isActiveColorDark = OkiColors.getColorBlack(colors.background);
        let mainColor: string;
        if (isActiveColorDark) {
            mainColor = "#ffffff";
        } else {
            mainColor = "#000000";
        }
        const profileAccentColor = OkiColors.toReadableContrastColors(colors).foreground;

        ctx.beginPath();
        ctx.fillStyle = colors.background;
        OkiFormat.rect(ctx, 0, 0, canvas.width, canvas.height, 0);
        ctx.fill();

        const backgroundImage = await Canvas.loadImage(background);
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 40;
        ctx.save();
        OkiFormat.rect(ctx, 0, 0, canvas.width, 432, 0);
        ctx.clip();

        if (!isActiveColorDark) {
            ctx.globalCompositeOperation = "soft-light";
        }

        ctx.drawImage(backgroundImage, -500, 0, canvas.width + 1000, 695);

        ctx.fillStyle = "rgb(100, 100, 100)";
        if (isActiveColorDark) {
            ctx.globalCompositeOperation = "multiply";
            ctx.globalAlpha = 0.5;
        } else {
            ctx.globalAlpha = 0.3;
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;

        ctx.clip();
        ctx.restore();
        ctx.shadowBlur = 0;
        ctx.save();

        const userPicture = await Canvas.loadImage(avatar);

        OkiFormat.rect(ctx, 44, 55, 277, 277, 47);
        ctx.clip();

        const scale = Math.max(280 / userPicture.width, 280 / userPicture.height);
        const x = 170 + 14 - (userPicture.width / 2) * scale;
        const y = 170 + 25 - (userPicture.height / 2) * scale;
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 40;
        ctx.drawImage(userPicture, x, y, userPicture.width * scale, userPicture.height * scale);
        ctx.restore();

        const modeIconSize = 72;
        const modeIconAsset = await this.getModeAssetData(user.mode, "#FFFFFF", modeIconSize, modeIconSize);
        if (modeIconAsset) {
            const modeIcon = await Canvas.loadImage(modeIconAsset);
            ctx.save();
            ctx.beginPath();
            ctx.fillStyle = OkiColors.getWhiteIconBackgroundColour(colors.background);
            ctx.arc(298, 307, (modeIconSize * 14) / 32, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            ctx.drawImage(modeIcon, 298 - modeIconSize / 2, 307 - modeIconSize / 2, modeIconSize, modeIconSize);
        }

        if (user.is_supporter) {
            const heartAsset = await this.getAssetData("heart.png");
            if (heartAsset) {
                const heart = await Canvas.loadImage(heartAsset);
                ctx.drawImage(heart, 40, 261, 86, 86);
            }
        }

        ctx.fillStyle = mainColor;
        ctx.font = "63px VarelaRound, NotoSansSC";
        ctx.fillText(user.nickname, 347, 56 + 63);

        ctx.font = "40px VarelaRound, NotoSansSC";
        const country = await this.getCountryName(user.country);
        const flagAsset = await this.getFlagAssetData(user.country);
        if (flagAsset) {
            const flag = await Canvas.loadImage(flagAsset);
            if (flag.width === 36 && flag.height === 36) {
                ctx.drawImage(flag, 0, 5, 36, 26, 350, 130, 60, 40);
            } else {
                ctx.drawImage(flag, 350, 130, 60, 40);
            }
            ctx.fillText(country, 420, 127 + 40);
        }

        const gradeA = await Canvas.loadImage(await this.getGradeAssetData("a"));
        const gradeS = await Canvas.loadImage(await this.getGradeAssetData("s"));
        const gradeSS = await Canvas.loadImage(await this.getGradeAssetData("x"));
        const gradeSH = await Canvas.loadImage(await this.getGradeAssetData("sh"));
        const gradeSSH = await Canvas.loadImage(await this.getGradeAssetData("xh"));

        ctx.drawImage(gradeA, 766, 112 + 25, 98, 50);
        ctx.drawImage(gradeS, 922, 112 + 25, 98, 50);
        ctx.drawImage(gradeSH, 1080, 112 + 25, 98, 50);
        ctx.drawImage(gradeSS, 847, 221 + 25, 98, 50);
        ctx.drawImage(gradeSSH, 1002, 221 + 25, 98, 50);

        ctx.font = "28px VarelaRound, NotoSansSC";
        ctx.textAlign = "center";
        ctx.fillText(OkiFormat.number(user.grades?.a || 0), 792 + 22, 171 + 25 + 28);
        ctx.fillText(OkiFormat.number(user.grades?.s || 0), 955 + 16, 171 + 25 + 28);
        ctx.fillText(OkiFormat.number(user.grades?.sh || 0), 1108 + 22, 171 + 25 + 28);
        ctx.fillText(OkiFormat.number(user.grades?.ss || 0), 888 + 9, 279 + 25 + 28);
        ctx.fillText(OkiFormat.number(user.grades?.ssh || 0), 1038 + 13, 279 + 25 + 28);

        ctx.textAlign = "left";
        ctx.font = "75px VarelaRound, NotoSansSC";
        ctx.fillText("#" + OkiFormat.number(user.rank.total || 0), 347, 170 + 75);

        ctx.font = "57px VarelaRound, NotoSansSC";
        ctx.fillText("#" + OkiFormat.number(user.rank.country || 0), 347, 259 + 57);

        const level = Math.floor(user.level | 0);
        const levelIconWidth = 72;
        const levelIconHeight = 77;
        const levelIconX = 342;
        const levelIconY = 332;
        const levelIconAsset = await this.getUserLevelAssetData(level, levelIconWidth, levelIconHeight);
        if (levelIconAsset) {
            const levelIcon = await Canvas.loadImage(levelIconAsset);
            ctx.drawImage(levelIcon, levelIconX, levelIconY, levelIconWidth, levelIconHeight);
        }

        const levelText = level.toString();
        ctx.textAlign = "center";
        ctx.font = "30px VarelaRound, NotoSansSC";
        ctx.fillText(levelText, levelIconX + levelIconWidth / 2, levelIconY + 50);

        const levelBarX = 441;
        const levelBarY = 363;
        const levelBarWidth = 504;
        const levelBarHeight = 14;
        const levelProgress = Math.min(Math.max(user.levelProgress || 0, 0), 100);
        const levelProgressWidth = levelBarWidth * (levelProgress / 100);
        ctx.fillStyle = profileAccentColor + "31";
        OkiFormat.rect(ctx, levelBarX, levelBarY, levelBarWidth, levelBarHeight, levelBarHeight / 2);
        if (levelProgressWidth > 0) {
            const levelProgressGradient = ctx.createLinearGradient(
                levelBarX,
                levelBarY,
                levelBarX + levelProgressWidth,
                levelBarY
            );
            levelProgressGradient.addColorStop(0, profileAccentColor);
            levelProgressGradient.addColorStop(1, mainColor);
            ctx.fillStyle = levelProgressGradient;
            OkiFormat.rect(ctx, levelBarX, levelBarY, levelProgressWidth, levelBarHeight, levelBarHeight / 2);
        }

        ctx.fillStyle = mainColor;
        ctx.font = "21px VarelaRound, NotoSansSC";
        ctx.textAlign = "left";
        ctx.fillText(Math.floor(levelProgress) + "%", 960, 380);

        this.drawRows(ctx, 480, canvas.width / 2, mainColor, 32, 40, 24, 12, 10, 48, 28, 16, [
            [
                {
                    text: "pp",
                    value: Util.round(user.pp, 0).toLocaleString(),
                },
                {
                    text: l.tr("player-accuracy"),
                    value: user.accuracy.toFixed(2) + "%",
                },
                ...(user.playtime !== undefined
                    ? [
                          {
                              text: l.tr("player-playtime"),
                              value: Util.minutesToPlaytimeString(user.playtime),
                          },
                      ]
                    : []),
                {
                    text: l.tr("player-playcount"),
                    value: user.playcount.toLocaleString(),
                },
            ],
        ]);

        if (user.rankedPlay) {
            const rankedPlay = user.rankedPlay;
            ctx.fillStyle = mainColor + "21";
            OkiFormat.rect(ctx, 44, 616, 1112, 160, 20);
            ctx.fill();

            ctx.fillStyle = mainColor;
            ctx.textAlign = "left";
            ctx.textBaseline = "alphabetic";
            ctx.font = "bold 42px Torus";
            ctx.fillText(l.tr("player-ranked-play"), 72, 678);

            ctx.font = "28px Mulish, NotoSansSC";
            ctx.fillText(rankedPlay.poolName, 72, 738);

            const rankedFields = [
                {
                    label: l.tr("player-rank"),
                    value: rankedPlay.rank ? `#${OkiFormat.number(rankedPlay.rank)}` : "—",
                },
                {
                    label: l.tr("player-ranked-play-rating"),
                    value: OkiFormat.number(rankedPlay.rating) + (rankedPlay.provisional ? "*" : ""),
                },
                {
                    label: l.tr("player-ranked-play-wins"),
                    value: OkiFormat.number(rankedPlay.wins),
                },
                {
                    label: l.tr("player-ranked-play-games"),
                    value: OkiFormat.number(rankedPlay.plays),
                },
            ];
            const rankedFieldsStartX = 500;
            const rankedFieldsEndX = 1085;
            const rankedFieldSpacing = (rankedFieldsEndX - rankedFieldsStartX) / (rankedFields.length - 1);

            ctx.textAlign = "center";
            for (const [index, field] of rankedFields.entries()) {
                const fieldX = rankedFieldsStartX + rankedFieldSpacing * index;
                ctx.font = "28px Mulish, NotoSansSC";
                ctx.fillText(field.label, fieldX, 670);
                ctx.font = "bold 48px Torus";
                ctx.fillText(field.value, fieldX, 736);
            }
        }

        return canvas.toBuffer("image/png");
    }
}
