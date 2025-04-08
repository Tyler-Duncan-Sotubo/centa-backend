export type User = {
    id: string;
    username: string;
    email: string;
    password: string;
    role: 'student' | 'teacher' | 'admin';
};
export type JwtType = {
    sub: string;
    email: string;
    iat: number;
    exp: number;
};
