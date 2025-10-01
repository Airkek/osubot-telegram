import * as rosu from "@kotrikd/rosu-pp";
import fs from "fs/promises";
import axios from "axios";
import crypto from "crypto";
import { IBeatmap } from "../../beatmaps/BeatmapTypes";
import Util from "../../Util";

const folderPath = "./beatmap_cache";

async function downloadRosuBeatmap(map: IBeatmap): Promise<string> {
    if (!(await Util.directoryExists(folderPath))) {
        await fs.mkdir(folderPath);
    }

    const filePath = `${folderPath}/${map.hash}.osu`;
    if (!(await Util.fileExists(filePath))) {
        const response = await axios.get(`https://osu.ppy.sh/osu/${map.id}`, {
            responseType: "arraybuffer",
        });

        const buffer = Buffer.from(response.data, "binary");
        const md5sum = crypto.createHash("md5").update(buffer).digest("hex");
        let savePath = filePath;
        if (md5sum !== map.hash) {
            savePath = `${folderPath}/${md5sum}.osu`;
            global.logger.error(`Beatmap ${map.id}: hash mismatch - expected '${map.hash}', got ${md5sum}`);
            if (await Util.fileExists(savePath)) {
                return savePath;
            }
        }

        await fs.writeFile(savePath, buffer);
    }

    return filePath;
}
export async function getRosuBeatmap(map: IBeatmap): Promise<rosu.Beatmap> {
    const filePath = await downloadRosuBeatmap(map);
    try {
        return new rosu.Beatmap(await fs.readFile(filePath, "utf-8"));
    } catch {
        global.logger.error(`Cannot download beatmap with hash ${map.hash}`);
    }
    return null;
}
