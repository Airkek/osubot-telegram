export type SqlParameters = unknown[];

export interface SqlExecutionResult {
    rowCount: number | null;
}

/**
 * Internal PostgreSQL boundary. Application code must depend on repositories,
 * never on this interface or raw SQL.
 */
export interface SqlExecutor {
    get<T>(statement: string, parameters?: SqlParameters): Promise<T | null>;
    all<T>(statement: string, parameters?: SqlParameters): Promise<T[]>;
    run(statement: string, parameters?: SqlParameters): Promise<SqlExecutionResult>;
}

export interface SqlDatabase extends SqlExecutor {
    transaction<T>(callback: (transaction: SqlExecutor) => Promise<T>): Promise<T>;
}

export interface SqlConnection extends SqlDatabase {
    close(): Promise<void>;
}
