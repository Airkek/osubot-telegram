import { ISqlDatabase } from "../src/infrastructure/database/ISqlDatabase";
import { ISqlExecutor } from "../src/infrastructure/database/ISqlExecutor";
import { expect, test } from "@jest/globals";
import { PostgresIdentityLinkRepository } from "../src/infrastructure/database/repositories/PostgresIdentityLinkRepository";

test("identity link tokens are persisted only as hashes", async () => {
    const statements: Array<{ sql: string; parameters: unknown[] }> = [];
    const transaction: ISqlExecutor = {
        get: async () => null,
        all: async () => [],
        run: async (sql, parameters = []) => {
            statements.push({ sql, parameters });
            return { rowCount: 1 };
        },
    };
    const database: ISqlDatabase = {
        ...transaction,
        get: async <T>() => ({ id: 1, user_id: 2, platform: "telegram" }) as T,
        transaction: async (callback) => await callback(transaction),
    };
    const repository = new PostgresIdentityLinkRepository(database);

    const token = await repository.createToken(1);
    const insert = statements.find((statement) => statement.sql.includes("INSERT INTO identity_link_tokens"));
    const storedHash = String(insert.parameters[0]);

    expect(token.code).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
    expect(storedHash).toMatch(/^[a-f0-9]{64}$/);
    expect(storedHash).not.toContain(token.code.replace("-", ""));
    await expect(repository.consumeToken(2, "bad")).resolves.toEqual({ status: "invalid-token" });
});
