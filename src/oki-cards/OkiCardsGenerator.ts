import path from "path";
import fs from "fs";
import axios from "axios";
import Canvas, { GlobalFonts, loadImage } from "@napi-rs/canvas";
import { APIScore, APIUser } from "../Types";
import * as OkiColors from "./utils/OkiColors";
import * as OkiFormat from "./utils/OkiFormat";
import { ILocalisator } from "../ILocalisator";
import Util from "../Util";
import { IBeatmap } from "../beatmaps/BeatmapTypes";
import BanchoPP from "../osu_specific/pp/bancho";

type CountryCodes = {
    [key: string]: string;
};

export class OkiCardsGenerator {
    private readonly assetsDirectory: string;
    private readonly countryCodes: CountryCodes;

    constructor() {
        this.assetsDirectory = path.join("./assets", "oki-chan");
        try {
            const data = fs.readFileSync(this.getAssetPath("country_codes.json"), "utf8");
            this.countryCodes = JSON.parse(data);
        } catch (err) {
            global.logger.fatal(`failed to get country code names: ${err}`);
        }

        this.registerFont("Torus.ttf", "Torus");
        this.registerFont("Mulish.ttf", "Mulish");
        this.registerFont("VarelaRound.ttf", "VarelaRound");
        this.registerFont("NotoSansSC-Regular.ttf", "NotoSansSC");
    }

    private registerFont(assetName: string, fontName: string) {
        const font = this.getAssetData(assetName);
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
        return this.getAssetPath(path.join("mods", modAcronym));
    }

    private getAssetDataByPath(path: string): Buffer {
        if (!fs.existsSync(path)) {
            return undefined;
        }

        return Buffer.from(fs.readFileSync(path));
    }

    private getAssetData(assetName: string): Buffer {
        const path = this.getAssetPath(assetName);
        return this.getAssetDataByPath(path);
    }

    private getModAssetData(modAcronym: string): Buffer {
        const path = this.getModAssetPath(modAcronym + ".png");
        return this.getAssetDataByPath(path);
    }

    private getFlagAssetPath(countryCode: string): string {
        return this.getAssetPath(path.join("flags", countryCode + ".png"));
    }

    private getFlagAssetData(countryCode: string): Buffer {
        const path = this.getFlagAssetPath(countryCode);
        const flag = this.getAssetDataByPath(path);

        if (!flag) {
            const unknownFlagPath = this.getFlagAssetPath("XX");
            return this.getAssetDataByPath(unknownFlagPath);
        }

        return flag;
    }

    private getModeAssetData(mode: number): Buffer {
        let modIconAsset: string = undefined;
        switch (mode) {
            case 0:
                modIconAsset = "osu.png";
                break;
            case 1:
                modIconAsset = "taiko.png";
                break;
            case 2:
                modIconAsset = "fruits.png";
                break;
            case 3:
                modIconAsset = "mania.png";
                break;

            default:
                return undefined;
        }

        return this.getAssetData(modIconAsset);
    }

    private getGradeAssetData(grade: string): Buffer {
        let gradeIconAsset: string = undefined;
        switch (grade.toLowerCase()) {
            case "a":
                gradeIconAsset = "grade_a.png";
                break;
            case "b":
                gradeIconAsset = "grade_b.png";
                break;
            case "c":
                gradeIconAsset = "grade_c.png";
                break;
            case "d":
                gradeIconAsset = "grade_d.png";
                break;
            case "s":
                gradeIconAsset = "grade_s.png";
                break;
            case "s+":
            case "sh":
                gradeIconAsset = "grade_sh.png";
                break;
            case "x":
            case "ss":
                gradeIconAsset = "grade_ss.png";
                break;
            case "x+":
            case "xh":
                gradeIconAsset = "grade_ssh.png";
                break;

            default:
                // TODO: F
                return undefined;
        }

        return this.getAssetData(gradeIconAsset);
    }

    private async loadImageFromUrl(url: string): Promise<Buffer> {
        try {
            const res = await axios.get(url, {
                responseType: "arraybuffer",
            });
            return res.data;
        } catch {
            return undefined;
        }
    }

    async generateTopScoresCard(scores: APIScore[], maps: IBeatmap[], user: APIUser, l: ILocalisator): Promise<Buffer> {
        const canvas = Canvas.createCanvas(1200, 450);
        const ctx = canvas.getContext("2d");
        ctx.beginPath();
        ctx.fillStyle = "#2a2226";
        OkiFormat.rect(ctx, 0, 0, canvas.width, canvas.height, 0);
        ctx.fill();

        ctx.textAlign = "left";
        ctx.font = "50px Torus, VarelaRound, NotoSansSC";
        ctx.fillStyle = "#ffffff";
        const header = l.tr("best-scores-header");
        ctx.fillText(header, 40, 60);
        const headerMetrics = ctx.measureText(header);

        let startpos = 90;
        let textpos = 113;
        let diffpos = 130;
        const between = 60;

        ctx.textAlign = "left";
        ctx.font = `32px Mulish, NotoSansSC`;
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
            // Score block
            ctx.beginPath();
            ctx.fillStyle = "#54454C";
            ctx.fill();
            OkiFormat.rect(ctx, 45, startpos, canvas.width - 45 * 2, 52, 10);

            // Rank icon
            const rankAsset = this.getGradeAssetData(score.rank);
            if (rankAsset) {
                const rankImage = await loadImage(rankAsset);
                ctx.drawImage(rankImage, 57, startpos + 12, 49, 25);
            }

            // Title
            ctx.textAlign = "left";
            ctx.font = "20px Mulish";
            ctx.fillStyle = "#ffffff";
            ctx.fillText(beatmap.title, 120, textpos);

            // Diff
            const diffname = beatmap.version;
            ctx.textAlign = "left";
            ctx.font = "15px Torus";
            ctx.fillStyle = "rgb(255, 204, 34)";
            ctx.fillText(diffname, 120, diffpos);
            const diffnameSize = ctx.measureText(diffname);

            // Date
            ctx.textAlign = "left";
            ctx.font = "15px Mulish";
            ctx.fillStyle = "rgb(163, 143, 152)";
            ctx.fillText(Util.formatDate(score.date), 120 + diffnameSize.width + 20, diffpos);

            // pp block
            ctx.fillStyle = "#46393f";
            OkiFormat.rect(ctx, 1030, startpos, 125, 52, 10); // adjust the size and radius as needed
            ctx.fill();

            // PP
            // TODO: remove this dirty hack, calculate pp outside cards generator
            const pp = score.fcPp
                ? { pp: score.pp, fc: score.fcPp, ss: undefined }
                : new BanchoPP(beatmap, score.mods).calculate(score);

            let ppx = 1040;
            let ppy = startpos + 20;
            const isFc = pp.pp == pp.fc;
            if (isFc) {
                ppx += 10;
                ppy += 15;
            }

            ctx.textAlign = "left";
            ctx.font = "bold 20px Torus";
            ctx.fillStyle = "#FF66AB";
            ctx.fillText(`${Util.round(score.pp, 2)} pp`, ppx, ppy);

            if (!isFc) {
                ctx.textAlign = "left";
                ctx.font = "italic 20px Torus";
                ctx.fillStyle = "#FF66AB";
                ctx.fillText(`/ ${Util.round(pp.fc, 2)} pp`, ppx + 10, ppy + 25);
            }

            const mods = score.mods.toAcronymList();
            if (score.mods.mods.length == 0) {
                const image = await loadImage(this.getModAssetData("nomod"));
                ctx.drawImage(image, 970, startpos + 12, 46.5, 33);
            } else {
                let startmods = 970;

                for (let i = 0; i < mods.length; ++i) {
                    const asset = this.getModAssetData(mods[i]);
                    if (!asset) {
                        continue;
                    }
                    const image = await loadImage(asset);
                    ctx.drawImage(image, startmods, startpos + 12, 46.5, 33);
                    startmods = startmods - 50;
                }
            }

            startpos = startpos + between;
            textpos = textpos + between;
            diffpos = diffpos + between;
        }

        return canvas.toBuffer("image/png");
    }

    async generateUserCard(user: APIUser, l: ILocalisator): Promise<Buffer> {
        const canvas = Canvas.createCanvas(1200, 624);
        const ctx = canvas.getContext("2d");

        let background: Buffer = undefined;
        let avatar: Buffer = undefined;

        if (user.profileBackgroundUrl) {
            background = await this.loadImageFromUrl(user.profileBackgroundUrl);
        }
        if (!background) {
            background = this.getAssetData("unknown_bg.png");
        }

        if (user.profileAvatarUrl) {
            avatar = await this.loadImageFromUrl(user.profileAvatarUrl);
        }
        if (!avatar) {
            avatar = this.getAssetData("avatar-guest.png");
        }

        if (!background || !avatar) {
            return undefined;
        }

        const colors = await OkiColors.getColors(background);

        const isMainColorBlack = OkiColors.getColorBlack(colors.background);
        let mainColor: string;
        if (!isMainColorBlack) {
            mainColor = "#000000";
        } else {
            mainColor = "#ffffff";
        }

        ctx.beginPath();
        ctx.fillStyle = colors.background;
        OkiFormat.rect(ctx, 0, 0, canvas.width, canvas.height, 45);
        ctx.fill();

        const backgroundImage = await Canvas.loadImage(background);
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 40;
        ctx.save();
        OkiFormat.rect(ctx, 0, 0, canvas.width, 432, 45);
        ctx.clip();

        if (!isMainColorBlack) {
            ctx.globalCompositeOperation = "soft-light";
        }

        ctx.drawImage(backgroundImage, -500, 0, canvas.width + 1000, canvas.height + 71);

        if (isMainColorBlack) {
            ctx.globalCompositeOperation = "multiply";
            ctx.fillStyle = "rgb(100, 100, 100)"; // dest pixels will darken by
            // (128/255) * dest
            ctx.globalAlpha = 0.5;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = "source-over";
            ctx.globalAlpha = 1;
        } else {
            ctx.fillStyle = "rgb(100, 100, 100)";
            ctx.globalAlpha = 0.3;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = "source-over";
            ctx.globalAlpha = 1;
        }

        ctx.clip();
        ctx.restore();
        ctx.shadowBlur = 0;
        ctx.save();

        const userPicture = await loadImage(avatar);

        OkiFormat.rect(ctx, 44, 55, 277, 277, 47);
        ctx.clip();

        const scale = Math.max(280 / userPicture.width, 280 / userPicture.height);
        const x = 170 + 14 - (userPicture.width / 2) * scale;
        const y = 170 + 25 - (userPicture.height / 2) * scale;
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 40;
        ctx.drawImage(userPicture, x, y, userPicture.width * scale, userPicture.height * scale);
        ctx.restore();

        ctx.beginPath();
        ctx.ellipse(268 + 30, 277 + 30, 40, 40, 0, 0, Math.PI * 2);
        ctx.fill();

        const modIconAsset = this.getModeAssetData(user.mode);
        if (modIconAsset) {
            const modIcon = await loadImage(modIconAsset);
            ctx.drawImage(modIcon, 252, 261, 86, 86);
        }

        if (user.is_supporter) {
            const heartAsset = this.getAssetData("heart.png");
            if (heartAsset) {
                const heart = await loadImage(heartAsset);
                ctx.drawImage(heart, 40, 261, 86, 86);
            }
        }

        ctx.fillStyle = mainColor;
        ctx.font = "63px VarelaRound, NotoSansSC";
        ctx.fillText(user.nickname, 347, 56 + 63);

        ctx.font = "40px VarelaRound, NotoSansSC";
        const country = this.countryCodes[user.country] || "Unknown";
        const flagAsset = this.getFlagAssetData(user.country);
        if (flagAsset) {
            const flag = await loadImage(flagAsset);
            ctx.drawImage(flag, 350, 130, 60, 40);
            ctx.fillText(country, 420, 127 + 40);
        }

        const gradeA = await loadImage(this.getGradeAssetData("a"));
        const gradeS = await loadImage(this.getGradeAssetData("s"));
        const gradeSS = await loadImage(this.getGradeAssetData("x"));
        const gradeSH = await loadImage(this.getGradeAssetData("sh"));
        const gradeSSH = await loadImage(this.getGradeAssetData("xh"));

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

        const hexagon = await loadImage(this.getAssetData("hexagon.png"));
        ctx.drawImage(hexagon, 342, 332, 72, 77);

        const levelText = Math.floor(user.level | 0).toString();
        ctx.textAlign = "center";
        ctx.font = "33px VarelaRound, NotoSansSC";
        ctx.fillText(levelText, 378, 332 + 50);

        OkiFormat.rect(ctx, 441, 364, 504, 12, 7);
        ctx.fillStyle = "#FFCC22";
        OkiFormat.rect(ctx, 441, 364, 504 * ((user.levelProgress || 0) / 100), 12, 7);
        ctx.textAlign = "left";

        ctx.fillStyle = mainColor;
        ctx.font = "21px VarelaRound, NotoSansSC";
        ctx.fillText(Math.floor(user.levelProgress || 0) + "%", 960, 359 + 21);

        ctx.fillStyle = mainColor + "21";
        OkiFormat.rect(ctx, 44, 472, 191, 53, 30);
        OkiFormat.rect(ctx, 278, 472, 232, 53, 30);
        OkiFormat.rect(ctx, 547, 472, 306, 53, 30);
        OkiFormat.rect(ctx, 897, 472, 250, 53, 30);

        ctx.fillStyle = mainColor;
        ctx.textAlign = "center";
        ctx.font = "30px Mulish, NotoSansSC";
        ctx.fillText("pp", 118 + 20, 476 + 30);
        ctx.fillText(l.tr("player-accuracy"), 314 + 80, 478 + 30);
        ctx.fillText(l.tr("player-playtime"), 592 + 110, 476 + 30);
        ctx.fillText(l.tr("player-totalscore"), 973 + 50, 478 + 30);

        ctx.font = "40px Mulish, NotoSansSC";
        ctx.fillText(OkiFormat.number(Math.round(user.pp || 0)), 82 + 60, 534 + 40);
        ctx.fillText(Math.round((user.accuracy || 0) * 100) / 100 + "%", 324 + 75, 537 + 40);
        ctx.fillText(Util.minutesToPlaytimeString(user.playtime), 651 + 50, 536 + 40);
        ctx.fillText(OkiFormat.numberSuffix(user.total_score || 0), 930 + 100, 536 + 40);

        return canvas.toBuffer("image/png");
    }
}
