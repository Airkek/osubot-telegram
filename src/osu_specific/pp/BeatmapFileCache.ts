import axios from "axios";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { IBeatmap } from "../../beatmaps/BeatmapTypes";
import Util from "../../Util";

const folderPath = "./beatmap_cache";

export async function getBeatmapFile(map: IBeatmap): Promise<string> {
    await fs.mkdir(folderPath, { recursive: true });

    const filePath = path.resolve(folderPath, `${map.hash}.osu`);
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
            savePath = path.resolve(folderPath, `${md5sum}.osu`);
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
