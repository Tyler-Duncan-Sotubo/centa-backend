export type User = {
    id: string;
    username: string;
    email: string;
    password: string;
    role: 'super_admin' | 'admin' | 'employee' | 'hr_manager';
    companyId: string;
    permissions: string[];
    firstName: string;
    lastName: string;
};
