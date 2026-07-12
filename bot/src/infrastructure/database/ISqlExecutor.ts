import { ISqlExecutionResult } from "infrastructure/database/ISqlExecutionResult";
import { SqlParameters } from "infrastructure/database/SqlParameters";

/** Internal PostgreSQL boundary. Application code must depend on repositories, never on raw SQL. */
export interface ISqlExecutor {
    get<T>(statement: string, parameters?: SqlParameters): Promise<T | null>;
    all<T>(statement: string, parameters?: SqlParameters): Promise<T[]>;
    run(statement: string, parameters?: SqlParameters): Promise<ISqlExecutionResult>;
}
