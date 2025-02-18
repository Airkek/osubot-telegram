import fs from "fs";
import Util from "./Util";

interface Donater {
    id: number,
    status: number | string
}

type ServerString = string | "bancho" | "gatari" | "ripple" | "akatsuki" | "beatleader" | "scoresaber";

let servers = ["bancho", "gatari", "ripple", "akatsuki", "beatleader", "scoresaber"];

const DONATERS_DATA_FILE = "./data/donaters.json" // TODO: remove this shit

export default class Donaters {
    list: {
        bancho: Donater[],
        gatari: Donater[],
        ripple: Donater[],
        akatsuki: Donater[],
        beatleader: Donater[],
        scoresaber: Donater[]
    };
    constructor() {
        if(!fs.existsSync(DONATERS_DATA_FILE))
            fs.writeFileSync(DONATERS_DATA_FILE, JSON.stringify({bancho: [], gatari: [], ripple: [], akatsuki: [], beatleader: [], scoresaber: []}, null, 4));

        this.list = JSON.parse(fs.readFileSync(DONATERS_DATA_FILE).toString());

        for(let i = 0; i < servers.length; i++) {
            if(!this.list[servers[i]])
                this.list[servers[i]] = [];
        }

        this.save();
    }

    save() {
        fs.writeFileSync(DONATERS_DATA_FILE, JSON.stringify(this.list, null, 4));
        setTimeout(() => {
            this.save();
        }, 30000);
    }

    setDonater(server: ServerString, id: number, status: number | string = 0): boolean {
        if(!this.list[server])
            return false;
        if(this.list[server].some(a => a.id == id))
            this.list[server] = this.list[server].filter(d => d.id != id);
        this.list[server].push({
            id: id, status: status
        });
    }

    status(server: ServerString, id: number | string): string {
        if(!this.list[server])
            return '';
        let donater = this.list[server].find(d => d.id == id);
        return Util.donater(donater ? donater.status : 0);
    }
}