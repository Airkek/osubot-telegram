export interface IMediaReferenceCache {
    getPhoto(url: string): Promise<string | null>;
    storePhoto(url: string, attachment: string): Promise<void>;
}
