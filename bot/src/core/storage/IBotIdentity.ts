import { ExternalId } from "core/ExternalId";

export interface IBotIdentity {
    id: ExternalId;
    username?: string;
    first_name: string;
    last_name?: string;
}
