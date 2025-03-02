declare enum Role {
    ADMIN = "admin",
    HR_MANAGER = "hr_manager",
    EMPLOYEE = "employee"
}
export declare class InviteUserDto {
    email: string;
    name: string;
    role: Role;
}
export {};
