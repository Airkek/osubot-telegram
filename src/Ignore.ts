import { IgnoredUsersRepository } from "./core/ApplicationStorage";

export default class IgnoreList {
    list: Set<number>;
    repository: IgnoredUsersRepository;
    inited = false;

    constructor(repository: IgnoredUsersRepository) {
        this.list = new Set();
        this.repository = repository;
    }

    async init() {
        this.list = new Set(await this.repository.getIgnoredUsers());
        this.inited = true;
    }

    async switch(id: number): Promise<boolean> {
        if (!this.inited) {
            return false;
        }

        if (this.isIgnored(id)) {
            await this.repository.unignoreUser(id);
            this.list.delete(id);
            return false;
        }

        await this.repository.ignoreUser(id);
        this.list.add(id);

        return true;
    }

    isIgnored(id: number): boolean {
        return !this.inited || this.list.has(id);
    }
}
