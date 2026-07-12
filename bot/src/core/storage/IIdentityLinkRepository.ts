import { IdentityLinkResult } from "core/storage/IdentityLinkResult";
import { IIdentityLinkToken } from "core/storage/IIdentityLinkToken";

export interface IIdentityLinkRepository {
    createToken(accountId: number): Promise<IIdentityLinkToken>;
    consumeToken(accountId: number, code: string): Promise<IdentityLinkResult>;
}
