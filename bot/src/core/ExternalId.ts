export type ExternalId = string | number;

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
