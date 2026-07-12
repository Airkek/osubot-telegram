export interface IIgnoredUsersRepository {
    getIgnoredUsers(): Promise<number[]>;
    ignoreUser(accountId: number): Promise<void>;
    unignoreUser(accountId: number): Promise<void>;
}
