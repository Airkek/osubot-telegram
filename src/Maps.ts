import { IBeatmap } from "./beatmaps/BeatmapTypes";

interface Chat {
    id: number;
    map: IBeatmap;
}

export default class Maps {
    chats: Chat[];
    constructor() {
        this.chats = [];
    }

    getChat(id: number): Chat {
        return this.chats.find((chat) => chat.id == id);
    }

    setMap(id: number, map: IBeatmap) {
        if (!this.getChat(id)) {
            this.chats.push({
                id,
                map,
            });
            return;
        }
        const index = this.chats.findIndex((chat) => chat.id == id);
        this.chats[index].map = map;
    }
}
