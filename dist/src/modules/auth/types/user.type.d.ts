export type User = {
    id: string;
    username: string;
    email: string;
    password: string;
    role: 'student' | 'teacher' | 'admin';
    companyId: string;
    permissions: string[];
};
export type JwtType = {
    sub: string;
    email: string;
    iat: number;
    exp: number;
};
