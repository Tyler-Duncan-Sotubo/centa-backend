import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { db } from '../../drizzle/types/drizzle';
declare const JwtStrategy_base: new (...args: any) => any;
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly config;
    private readonly db;
    constructor(config: ConfigService, db: db);
    validate(payload: {
        sub: number;
        email: string;
    }): Promise<UnauthorizedException | {
        email: string;
        id: string;
        role: "admin" | "hr_manager" | "employee" | "payroll_specialist" | "super_admin";
        last_login: Date | null;
        firstName: string | null;
        lastName: string | null;
        company_id: string | null;
    }>;
}
export {};
