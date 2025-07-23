import { Bot as TG } from "grammy/out/bot";
import { InputFile } from "grammy";
import Database from "../Database";

interface Cover {
    id: number;
    attachment: string;
}

interface Image {
    url: string;
    attachment: string;
}

export class CoversModel {
    private readonly db: Database;
    private readonly tg: TG;
    private readonly owner: number;

    constructor(db: Database, tg: TG, owner: number) {
        this.db = db;
        this.tg = tg;
        this.owner = owner;
    }

    async addCover(id: number): Promise<string> {
        try {
            const file = new InputFile(new URL(`https://assets.ppy.sh/beatmaps/${id}/covers/cover@2x.jpg`));
            const send = await this.tg.api.sendPhoto(this.owner, file);
            const photo = send.photo[0].file_id;

            await this.db.run("INSERT INTO covers (id, attachment) VALUES ($1, $2)", [id, photo.toString()]);

            return photo.toString();
        } catch {
            return "";
        }
    }

    async getCover(id: number): Promise<string> {
        const cover = await this.db.get<Cover>("SELECT * FROM covers WHERE id = $1", [id]);
        if (!cover) {
            return this.addCover(id);
        }
        return cover.attachment;
    }

    async addPhotoDoc(photoUrl: string): Promise<string> {
        try {
            const file = new InputFile(new URL(photoUrl));
            const send = await this.tg.api.sendPhoto(this.owner, file);
            const photo = send.photo[0].file_id;

            await this.db.run("INSERT INTO photos (url, attachment) VALUES ($1, $2)", [photoUrl, photo.toString()]);

            return photo.toString();
        } catch {
            return "";
        }
    }

    async getPhotoDoc(photoUrl: string): Promise<string> {
        const cover = await this.db.get<Image>("SELECT * FROM photos WHERE url = $1", [photoUrl]);
        if (!cover) {
            return this.addPhotoDoc(photoUrl);
        }
        return cover.attachment;
    }

    async removeEmpty() {
        await this.db.run("DELETE FROM covers WHERE attachment = $1", [""]);
        await this.db.run("DELETE FROM photos WHERE attachment = $1", [""]);
    }
}
