export interface CoversProvider {
    getCover(id: number): Promise<string>;
    getPhotoDoc(photoUrl: string): Promise<string>;
}
