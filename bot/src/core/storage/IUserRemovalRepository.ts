export interface IUserRemovalRepository {
    dropUser(userId: number): Promise<void>;
}
