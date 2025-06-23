declare const STATUSES: readonly ["probation", "active", "on_leave", "resigned", "terminated"];
export declare class SearchEmployeesDto {
    search?: string;
    departmentId?: string;
    jobRoleId?: string;
    costCenterId?: string;
    locationId?: string;
    status?: (typeof STATUSES)[number];
}
export {};
