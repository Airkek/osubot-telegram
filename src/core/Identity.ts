export const SUPPORTED_PLATFORMS = ["telegram", "vk"] as const;

export type Platform = (typeof SUPPORTED_PLATFORMS)[number];
export type ExternalId = string | number;

export interface PlatformAccountIdentity {
    readonly accountId: number;
    readonly userId: number;
    readonly platform: Platform;
    readonly externalId: string;
}

export interface PlatformChatIdentity {
    readonly chatId: number;
    readonly platform: Platform;
    readonly externalId: string;
}

export interface IdentityRepository {
    readonly platform: Platform;

    findUser(externalId: ExternalId): Promise<PlatformAccountIdentity | null>;
    resolveUser(externalId: ExternalId): Promise<PlatformAccountIdentity>;
    getUser(accountId: number): Promise<PlatformAccountIdentity | null>;
    findChat(externalId: ExternalId): Promise<PlatformChatIdentity | null>;
    resolveChat(externalId: ExternalId): Promise<PlatformChatIdentity>;
    getChat(chatId: number): Promise<PlatformChatIdentity | null>;
    getUserAccounts(userId: number): Promise<PlatformAccountIdentity[]>;
}

export interface MessageIdentity {
    readonly user: PlatformAccountIdentity;
    readonly chat: PlatformChatIdentity;
    readonly replyUser?: PlatformAccountIdentity;
}

export function normalizeExternalId(id: ExternalId): string {
    return String(id);
}

export function externalIdFromStorage(id: string): ExternalId {
    if (/^-?(0|[1-9]\d*)$/.test(id)) {
        const numeric = Number(id);
        if (Number.isSafeInteger(numeric)) {
            return numeric;
        }
    }
    return id;
}
