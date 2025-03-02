export type User = {
    id: string;
    username: string;
    email: string;
    password: string;
    role: 'student' | 'teacher' | 'admin';
};
