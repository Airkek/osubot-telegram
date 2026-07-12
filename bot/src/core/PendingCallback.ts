import { IMessageContext } from "core/IMessageContext";

export type PendingCallback = (context: IMessageContext) => Promise<boolean>;
