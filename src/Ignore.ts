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

    switch(id: number): boolean {
        if (!this.inited) {
            return false;
        }

        if (this.isIgnored(id)) {
            this.list.delete(id);
            this.db.ignore.unignoreUser(id);
            return false;
        }

        this.list.add(id);
        this.db.ignore.ignoreUser(id);

        return true;
    }

    isIgnored(id: number): boolean {
        return !this.inited || this.list.has(id);
    }
}
