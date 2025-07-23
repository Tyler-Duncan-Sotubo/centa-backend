export declare enum Role {
    SUPER_ADMIN = "super_admin",
    HR_MANAGER = "hr_manager",
    PAYROLL_SPECIALIST = "payroll_specialist",
    FINANCE_OFFICER = "finance_officer",
    EMPLOYEE = "employee",
    MANAGER = "manager",
    ADMIN = "admin",
    RECRUITER = "recruiter"
}
export declare class RegisterDto {
    email: string;
    companyName: string;
    domain: string;
    country: string;
    firstName: string;
    lastName: string;
    role: Role;
    password: string;
    passwordConfirmation: string;
}
