import * as rosu from "rosu-pp-js";
import fs from "fs";
import axios from "axios";
import crypto from "crypto";
import { IBeatmap } from "../../beatmaps/BeatmapTypes";

const folderPath = process.env.OSU_BEATMAP_CACHE;

function ensureHashed(map: IBeatmap) {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
    }

    const idFile = `${folderPath}/${map.id}.osu`;
    if (fs.existsSync(idFile)) {
        const buffer = fs.readFileSync(idFile);
        const md5sum = crypto.createHash("md5").update(buffer).digest("hex");

        const newFile = `${folderPath}/${md5sum}.osu`;
        fs.renameSync(idFile, newFile);
        global.logger.info(`Renamed '${idFile}' to '${newFile}'`);
    }
}

async function downloadRosuBeatmap(map: IBeatmap) {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
    }

    ensureHashed(map);

    const filePath = `${folderPath}/${map.hash}.osu`;
    if (!fs.existsSync(filePath)) {
        const response = await axios.get(`https://osu.ppy.sh/osu/${map.id}`, {
            responseType: "arraybuffer",
        });

        const buffer = Buffer.from(response.data, "binary");
        const md5sum = crypto.createHash("md5").update(buffer).digest("hex");
        let savePath = filePath;
        if (md5sum !== map.hash) {
            savePath = `${folderPath}/${md5sum}.osu`;
            global.logger.error(`Beatmap ${map.id}: hash mismatch - expected '${map.hash}', got ${md5sum}`);
            if (fs.existsSync(savePath)) {
                return filePath;
            }
        }

        fs.writeFileSync(savePath, buffer);
    }

    return filePath;
}
export async function getRosuBeatmap(map: IBeatmap): Promise<rosu.Beatmap> {
    const filePath = await downloadRosuBeatmap(map);
    if (fs.existsSync(filePath)) {
        return new rosu.Beatmap(fs.readFileSync(filePath, "utf-8"));
    }

    global.logger.error(`Cannot download beatmap with hash ${map.hash}`);
    return null;
}

export function getRosuBeatmapSync(map: IBeatmap): rosu.Beatmap {
    ensureHashed(map);
    const filePath = `${folderPath}/${map}.osu`;
    if (fs.existsSync(filePath)) {
        return new rosu.Beatmap(fs.readFileSync(filePath, "utf-8"));
    }

    global.logger.error(`Beatmap with hash ${map.hash} not found in .osu cache`);
    return null;
}
