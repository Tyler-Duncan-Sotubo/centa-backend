export declare enum EmploymentStatus {
    PROBATION = "probation",
    ACTIVE = "active",
    ON_LEAVE = "on_leave",
    RESIGNED = "resigned",
    TERMINATED = "terminated"
}
export declare class EmployeeProfileDto {
    employeeNumber: string;
    departmentId: string;
    locationId: string;
    payGroupId: string;
    jobRoleId: string;
    companyRoleId: string;
    costCenterId?: string | null;
    employmentStatus: EmploymentStatus;
    employmentStartDate: string;
    employmentEndDate?: string;
    confirmed: boolean;
}
