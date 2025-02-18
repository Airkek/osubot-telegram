import Database from "./Database";


export default class IgnoreList {
    list: Set<number>;
    db: Database;

    constructor(db: Database) {
        this.list = new Set();
        this.db = db;

        this.db.ignore.getIgnoredUsers().then(res => {
            this.list = new Set(res);
        })
    }

    switch(id: number): boolean {
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
        return this.list.has(id);
    }
}