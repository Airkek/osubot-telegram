export interface ITextLinkEntity {
    readonly type: "text_link";
    readonly offset: number;
    readonly length: number;
    readonly url: string;
}
