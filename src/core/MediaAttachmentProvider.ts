export interface MediaAttachmentProvider {
    addPhotoDoc(photoUrl: string): Promise<string>;
    getPhotoDoc(photoUrl: string): Promise<string>;
}
