import Database from "./data/Database";

export default class IgnoreList {
    list: Set<number>;
    db: Database;
    inited = false;

    constructor(db: Database) {
        this.list = new Set();
        this.db = db;
    }

    async init() {
        this.list = new Set(await this.db.ignore.getIgnoredUsers());
        this.inited = true;
    }

    async switch(id: number): Promise<boolean> {
        if (!this.inited) {
            return false;
        }

        if (this.isIgnored(id)) {
            await this.db.ignore.unignoreUser(id);
            this.list.delete(id);
            return false;
        }

        await this.db.ignore.ignoreUser(id);
        this.list.add(id);

        return true;
    }

    isIgnored(id: number): boolean {
        return !this.inited || this.list.has(id);
    }
}
