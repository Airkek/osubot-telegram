export interface IMediaAttachmentProvider {
    addPhotoDoc(photoUrl: string): Promise<string>;
    getPhotoDoc(photoUrl: string): Promise<string>;
}
