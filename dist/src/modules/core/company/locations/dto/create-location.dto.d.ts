export type LocationType = 'OFFICE' | 'HOME' | 'REMOTE';
export declare class CreateLocationDto {
    name: string;
    locationType?: LocationType;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    timeZone?: string;
    latitude?: number;
    longitude?: number;
}
