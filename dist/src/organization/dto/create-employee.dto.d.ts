export declare enum EmploymentStatus {
    ACTIVE = "active",
    INACTIVE = "inactive"
}
export declare class CreateEmployeeDto {
    employee_number: string;
    first_name: string;
    last_name: string;
    job_title: string;
    email: string;
    phone: string;
    employment_status: EmploymentStatus;
    start_date: string;
    department_name: string;
    department_id: string;
    group_name: string;
    is_active: boolean;
    annual_gross: number;
    hourly_rate: number;
    bonus: number;
    commission: number;
    bank_name: string;
    bank_account_number: string;
    apply_nhf: string;
    tin: string;
    pension_pin: string;
    nhf_number: string;
}
