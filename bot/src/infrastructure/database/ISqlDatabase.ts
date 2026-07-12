import { ISqlExecutor } from "infrastructure/database/ISqlExecutor";

export interface ISqlDatabase extends ISqlExecutor {
    transaction<T>(callback: (transaction: ISqlExecutor) => Promise<T>): Promise<T>;
}
