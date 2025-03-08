import * as rosu from "rosu-pp-js";
import fs from "fs";
import * as axios from "axios";

const folderPath = process.env.OSU_BEATMAP_CACHE;

async function downloadRosuBeatmap(id: number) {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
    }

    const filePath = `${folderPath}/${id}.osu`;
    if (!fs.existsSync(filePath)) {
        const response = await axios.default.get(`https://osu.ppy.sh/osu/${id}`, {
            responseType: "arraybuffer",
        });
        const buffer = Buffer.from(response.data, "binary");
        fs.writeFileSync(filePath, buffer);
    }

    return filePath;
}

export async function getRosuBeatmap(id: number): Promise<rosu.Beatmap> {
    const filePath = await downloadRosuBeatmap(id);
    if (fs.existsSync(filePath)) {
        return new rosu.Beatmap(fs.readFileSync(filePath, "utf-8"));
    }

    return null;
}

export function getRosuBeatmapSync(id: number): rosu.Beatmap {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
    }

    const filePath = `${folderPath}/${id}.osu`;
    if (fs.existsSync(filePath)) {
        return new rosu.Beatmap(fs.readFileSync(filePath, "utf-8"));
    }

    return null;
}
