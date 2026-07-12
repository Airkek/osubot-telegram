import { IPlatformAccountIdentity } from "core/IPlatformAccountIdentity";
import { IPlatformChatIdentity } from "core/IPlatformChatIdentity";

export interface IMessageIdentity {
    readonly user: IPlatformAccountIdentity;
    readonly chat: IPlatformChatIdentity;
    readonly replyUser?: IPlatformAccountIdentity;
}
