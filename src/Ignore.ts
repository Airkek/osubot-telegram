import fs from "fs";

const IGNORE_LIST_DATA_FILE = "./data/ignore_list.json" // TODO: move to database

export default class IgnoreList {
    list: number[];
    constructor() {
        if(!fs.existsSync(IGNORE_LIST_DATA_FILE))
            fs.writeFileSync(IGNORE_LIST_DATA_FILE, "[]");
        this.list = JSON.parse(fs.readFileSync(IGNORE_LIST_DATA_FILE).toString());
    }

    switch(id: number): boolean {
        if(this.list.includes(id))
            this.list.splice(
                this.list.indexOf(id), 1
            )
        else
            this.list.push(id);

        return this.isIgnored(id);
    }

    isIgnored(id: number): boolean {
        return this.list.includes(id);
    }
}