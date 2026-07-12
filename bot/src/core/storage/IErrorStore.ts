import { IErrorContext } from "core/storage/IErrorContext";
import { IStoredError } from "core/storage/IStoredError";

export interface IErrorStore {
    addError(context: IErrorContext, error: unknown): Promise<string>;
    getError(code: string): Promise<IStoredError | null>;
    clear(): Promise<void>;
}
