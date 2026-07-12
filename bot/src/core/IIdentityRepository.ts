import { ExternalId } from "core/ExternalId";
import { IPlatformAccountIdentity } from "core/IPlatformAccountIdentity";
import { IPlatformChatIdentity } from "core/IPlatformChatIdentity";
import { Platform } from "core/Platform";

export interface IIdentityRepository {
    readonly platform: Platform;

    findUser(externalId: ExternalId): Promise<IPlatformAccountIdentity | null>;
    resolveUser(externalId: ExternalId): Promise<IPlatformAccountIdentity>;
    getUser(accountId: number): Promise<IPlatformAccountIdentity | null>;
    findChat(externalId: ExternalId): Promise<IPlatformChatIdentity | null>;
    resolveChat(externalId: ExternalId): Promise<IPlatformChatIdentity>;
    getChat(chatId: number): Promise<IPlatformChatIdentity | null>;
    getUserAccounts(userId: number): Promise<IPlatformAccountIdentity[]>;
}
