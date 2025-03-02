export declare enum EmploymentStatus {
    ACTIVE = "active",
    INACTIVE = "inactive"
}
export declare class CreateEmployeeDto {
    employee_number: number;
    first_name: string;
    last_name: string;
    job_title: string;
    email: string;
    phone: string;
    employment_status: EmploymentStatus;
    start_date: string;
    department_id: string;
    is_active: boolean;
    annual_gross: number;
    hourly_rate: number;
    bonus: number;
    commission: number;
}
