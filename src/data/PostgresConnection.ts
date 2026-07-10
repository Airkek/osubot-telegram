import { Pool, PoolClient } from "pg";
import { SqlConnection, SqlExecutor, SqlParameters } from "./SqlExecutor";

class PostgresTransaction implements SqlExecutor {
    constructor(private readonly client: PoolClient) {}

    async get<T>(statement: string, parameters: SqlParameters = []): Promise<T | null> {
        const result = await this.client.query(statement, parameters);
        return (result.rows[0] as T) ?? null;
    }

    async all<T>(statement: string, parameters: SqlParameters = []): Promise<T[]> {
        const result = await this.client.query(statement, parameters);
        return result.rows as T[];
    }

    async run(statement: string, parameters: SqlParameters = []) {
        const result = await this.client.query(statement, parameters);
        return { rowCount: result.rowCount };
    }
}

export class PostgresConnection implements SqlConnection {
    constructor(private readonly pool: Pool) {}

    async get<T>(statement: string, parameters: SqlParameters = []): Promise<T | null> {
        const result = await this.pool.query(statement, parameters);
        return (result.rows[0] as T) ?? null;
    }

    async all<T>(statement: string, parameters: SqlParameters = []): Promise<T[]> {
        const result = await this.pool.query(statement, parameters);
        return result.rows as T[];
    }

    async run(statement: string, parameters: SqlParameters = []) {
        const result = await this.pool.query(statement, parameters);
        return { rowCount: result.rowCount };
    }

    async transaction<T>(callback: (transaction: SqlExecutor) => Promise<T>): Promise<T> {
        const client = await this.pool.connect();
        const transaction = new PostgresTransaction(client);

        try {
            await client.query("BEGIN");
            const result = await callback(transaction);
            await client.query("COMMIT");
            return result;
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    async close(): Promise<void> {
        await this.pool.end();
    }
}
