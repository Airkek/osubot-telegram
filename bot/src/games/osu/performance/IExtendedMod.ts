export interface IExtendedMod {
    acronym: string;
    rate?: number;
    settings?: Record<string, unknown> & {
        speed_change?: number;
    };
}
