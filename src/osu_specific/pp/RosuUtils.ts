import * as rosu from "rosu-pp-js";
import fs from "fs/promises";
import axios from "axios";
import crypto from "crypto";
import { IBeatmap } from "../../beatmaps/BeatmapTypes";
import Util from "../../Util";

const folderPath = "./beatmap_cache";

async function downloadRosuBeatmap(map: IBeatmap): Promise<string> {
    await fs.mkdir(folderPath, { recursive: true });

    const filePath = `${folderPath}/${map.hash}.osu`;
    let resolvedPath = filePath;
    if (!(await Util.fileExists(filePath))) {
        const response = await axios.get(`https://osu.ppy.sh/osu/${map.id}`, {
            responseType: "arraybuffer",
            timeout: 15000,
            maxContentLength: 50 * 1024 * 1024,
        });

        const buffer = Buffer.from(response.data);
        const header = buffer
            .subarray(0, 64)
            .toString("utf8")
            .replace(/^\uFEFF/, "");
        if (!header.startsWith("osu file format v")) {
            throw new Error(`Beatmap ${map.id}: osu! server returned an invalid file`);
        }
        const md5sum = crypto.createHash("md5").update(buffer).digest("hex");
        let savePath = filePath;
        if (md5sum !== map.hash) {
            savePath = `${folderPath}/${md5sum}.osu`;
            resolvedPath = savePath;
            global.logger.error(`Beatmap ${map.id}: hash mismatch - expected '${map.hash}', got ${md5sum}`);
            if (await Util.fileExists(savePath)) {
                return savePath;
            }
        }

        await fs.writeFile(savePath, buffer);
    }

    return resolvedPath;
}
export async function getRosuBeatmap(map: IBeatmap): Promise<rosu.Beatmap> {
    const filePath = await downloadRosuBeatmap(map);
    try {
        return new rosu.Beatmap(await fs.readFile(filePath, "utf-8"));
    } catch (error) {
        global.logger.error(`Cannot parse beatmap with hash ${map.hash}`, error);
    }
    return null;
}
