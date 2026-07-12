import { Platform } from "core/Platform";

export type IdentityLinkResult =
    | { status: "linked"; userId: number; platforms: Platform[] }
    | { status: "already-linked"; userId: number; platforms: Platform[] }
    | { status: "invalid-token" }
    | { status: "same-account" }
    | { status: "platform-conflict"; platforms: Platform[] };
