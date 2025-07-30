import axios from "axios";

interface OrdrSkinMetadata {
    id: number;
    safe_name: string;
    name: string;
}

interface PageResponse {
    skins: OrdrSkinMetadata[];
    maxPage: number;
}

interface ApiSkin {
    skin: string;
    presentationName: string;
    url: string;
    highResPreview: string;
    lowResPreview: string;
    gridPreview: string;
    id: number;
    hasCursorMiddle: boolean;
}

interface CustomSkinInfo {
    found: boolean;
    removed?: boolean;
    message?: string;
    skinName?: string;
    skinAuthor?: string;
    downloadLink?: string;
}

const PageSize = 6;
export class OrdrSkinsProvider {
    private readonly cached: { [page: number]: OrdrSkinMetadata[] } = {};
    private cachedMaxPage: number;
    private readonly cachedCustom: { [id: string]: CustomSkinInfo } = {};
    constructor() {}

    async getPage(page: number): Promise<PageResponse> {
        const fromCache = this.cached[page];
        if (fromCache) {
            return {
                skins: fromCache,
                maxPage: this.cachedMaxPage,
            };
        }

        const { data } = await axios.get(`https://apis.issou.best/ordr/skins?pageSize=${PageSize}&page=${page}`);

        if (!data.maxSkins || !data.skins) {
            return undefined;
        }

        const maxSkins: number = data.maxSkins;
        const rawSkins: ApiSkin[] = data.skins;

        const skins = rawSkins.map((s): OrdrSkinMetadata => {
            return {
                id: s.id,
                safe_name: s.skin,
                name: s.presentationName,
            };
        });

        this.cached[page] = skins;
        this.cachedMaxPage = Math.ceil(maxSkins / PageSize);
        setTimeout(
            () => {
                this.cached[page] = undefined;
            },
            60 * 1000 * 60
        );

        return {
            skins,
            maxPage: this.cachedMaxPage,
        };
    }

    async getSkinByIdAndPage(page: number, id: number): Promise<string> {
        const list = await this.getPage(page);
        for (const skin of list.skins) {
            if (skin.id == id) {
                return skin.safe_name;
            }
        }
        global.logger.warn(`Unable to get skin safe name by id and page: (id - ${id}, page - ${page})`);
        return id.toString();
    }

    async getCustomSkinInfo(id: string): Promise<CustomSkinInfo> {
        if (this.cachedCustom[id]) {
            return this.cachedCustom[id];
        }

        let skinInfo: CustomSkinInfo = {
            found: false,
        };
        try {
            const { data } = await axios.get(`https://apis.issou.best/ordr/skins/custom?id=${id}`);
            skinInfo = data;
        } catch (e) {
            if (e?.response?.status === 404) {
                skinInfo = e.response.data as CustomSkinInfo;
            }
        }

        if (skinInfo) {
            this.cachedCustom[id] = skinInfo;
            setTimeout(
                () => {
                    this.cachedCustom[id] = undefined;
                },
                60 * 1000 * 60
            );
        }

        return skinInfo;
    }
}
