import { ISqlDatabase } from "infrastructure/database/ISqlDatabase";

export interface ISqlConnection extends ISqlDatabase {
    close(): Promise<void>;
}
