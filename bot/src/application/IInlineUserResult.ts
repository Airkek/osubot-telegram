import { MediaFile } from "core/MediaFile";

export interface IInlineUserResult {
    /** Display name of the server the profile was read from. */
    serverName: string;

    nickname: string;

    /** Short stats line shown under the title in the inline result list. */
    description: string;

    /** Message body sent when the result is picked. */
    text: string;

    /** Rendered profile card, absent when card generation failed. */
    card?: MediaFile;
}
