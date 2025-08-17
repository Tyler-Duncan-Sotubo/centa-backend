export declare const VISIBILITY_VALUES: readonly ["private", "manager", "company"];
export type Visibility = (typeof VISIBILITY_VALUES)[number];
export declare const CADENCE_VALUES: readonly ["weekly", "biweekly", "monthly"];
export type Cadence = (typeof CADENCE_VALUES)[number];
export declare class UpsertCompanyPolicyDto {
    defaultVisibility?: Visibility;
    defaultCadence?: Cadence;
    defaultTimezone?: string;
    defaultAnchorDow?: number;
    defaultAnchorHour?: number;
}
export declare class UpsertTeamPolicyDto {
    visibility?: Visibility;
    cadence?: Cadence;
    timezone?: string;
    anchorDow?: number;
    anchorHour?: number;
    defaultOwnerIsLead?: boolean;
}
