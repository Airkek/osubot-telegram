import { describe, expect, jest, test } from "@jest/globals";
import { InvalidLinkCodeError } from "../src/core/errors/InvalidLinkCodeError";
import { LinkServiceClient } from "../src/infrastructure/link/LinkServiceClient";

const httpError = (status: number) =>
    Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status } });

describe("LinkServiceClient", () => {
    test("disables linking when no API URL is configured", async () => {
        const service = new LinkServiceClient(" ");
        expect(service.api).toBeUndefined();
        expect(await service.getSupportedServers()).toEqual([]);
    });

    test("reads the supported servers and preserves configured page URL parameters", async () => {
        const service = new LinkServiceClient("https://link.test/api/verify/", "https://link.test/link?lang=ru");
        const request = jest.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
            data: { servers: ["bancho", "morasooma"] },
        }));
        service.api.get = request as never;

        expect(await service.getSupportedServers()).toEqual(["bancho", "morasooma"]);
        expect(request).toHaveBeenCalledWith("/api/servers");
        expect(service.api.defaults.baseURL).toBe("https://link.test");
        expect(service.api.defaults.timeout).toBe(15000);
        expect(service.getPageUrl("morasooma")).toBe("https://link.test/link?lang=ru&server=morasooma");
    });

    test("recognizes older backends as Bancho-only", async () => {
        const service = new LinkServiceClient("https://link.test");
        service.api.get = jest.fn(async () => {
            throw httpError(404);
        }) as never;
        expect(await service.getSupportedServers()).toEqual(["bancho"]);
        expect(service.getPageUrl("bancho")).toBe("https://link.test/link?server=bancho");
    });

    test.each([500, 503])("does not disable verification on discovery HTTP %i", async (status) => {
        const service = new LinkServiceClient("https://link.test");
        const error = httpError(status);
        service.api.get = jest.fn(async () => {
            throw error;
        }) as never;
        await expect(service.getSupportedServers()).rejects.toBe(error);
    });

    test.each([{}, { servers: "bancho" }, { servers: ["bancho", 1] }])(
        "rejects a malformed server list",
        async (data) => {
            const service = new LinkServiceClient("https://link.test");
            service.api.get = jest.fn(async () => ({ data })) as never;
            await expect(service.getSupportedServers()).rejects.toThrow("Invalid supported servers");
        }
    );

    test.each(["bancho", "morasooma"])("verifies a code specifically for %s", async (server) => {
        const service = new LinkServiceClient("https://link.test");
        const request = jest.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
            data: { server, user_id: "130", is_restrict: true },
        }));
        service.api.get = request as never;
        expect(await service.verifyCode(server, "ABCDEFGH")).toEqual({ userId: "130", isRestricted: true });
        expect(request).toHaveBeenCalledWith("/api/verify", { params: { server, code: "ABCDEFGH" } });
    });

    test.each([
        { server: "bancho", user_id: "130" },
        { user_id: "130" },
        { server: "morasooma", user_id: "invalid" },
        { server: "morasooma", user_id: 0 },
        { server: "morasooma", user_id: "130", is_restrict: "false" },
    ])("rejects mismatched or invalid Morasooma verification results", async (data) => {
        const service = new LinkServiceClient("https://link.test");
        service.api.get = jest.fn(async () => ({ data })) as never;
        await expect(service.verifyCode("morasooma", "ABCDEFGH")).rejects.toBeInstanceOf(InvalidLinkCodeError);
    });

    test("accepts the legacy Bancho response without a server field", async () => {
        const service = new LinkServiceClient("https://link.test");
        service.api.get = jest.fn(async () => ({ data: { user_id: "42", is_restrict: false } })) as never;
        expect(await service.verifyCode("bancho", "ABCDEFGH")).toEqual({ userId: "42", isRestricted: false });
    });

    test.each([400, 404, 410, 422])("maps verification HTTP %i to an invalid code", async (status) => {
        const service = new LinkServiceClient("https://link.test");
        service.api.get = jest.fn(async () => {
            throw httpError(status);
        }) as never;
        await expect(service.verifyCode("bancho", "ABCDEFGH")).rejects.toBeInstanceOf(InvalidLinkCodeError);
    });
});
