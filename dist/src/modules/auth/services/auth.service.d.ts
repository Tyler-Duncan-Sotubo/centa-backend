import { UserService } from './user.service';
import { TokenGeneratorService } from './token-generator.service';
import { LoginDto } from '../dto';
import { db } from 'src/drizzle/types/drizzle';
import { Response } from 'express';
import { AuditService } from 'src/modules/audit/audit.service';
import { JwtType } from '../types/user.type';
import { LoginVerificationService } from './login-verification.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { PermissionsService } from '../permissions/permissions.service';
import { PinoLogger } from 'nestjs-pino';
export declare class AuthService {
    private db;
    private readonly userService;
    private readonly tokenGeneratorService;
    private readonly auditService;
    private readonly verifyLogin;
    private readonly configService;
    private readonly jwtService;
    private readonly companySettingsService;
    private readonly permissionsService;
    private readonly logger;
    constructor(db: db, userService: UserService, tokenGeneratorService: TokenGeneratorService, auditService: AuditService, verifyLogin: LoginVerificationService, configService: ConfigService, jwtService: JwtService, companySettingsService: CompanySettingsService, permissionsService: PermissionsService, logger: PinoLogger);
    private completeLogin;
    login(dto: LoginDto, context: "ESS" | "DASHBOARD" | "AUTO" | undefined, ip: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            role: string;
            companyId: string;
            avatar: string | null;
            roleId: string;
        };
        backendTokens: {
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
        };
        permissions: string[];
    } | {
        user: {
            id: any;
            firstName: any;
            lastName: any;
            email: string;
            companyId: string;
            companyName: string;
            avatar: string | null;
            role: string;
            roleId: string;
            employmentStatus: any;
        } | {
            id: any;
            firstName: any;
            lastName: any;
            email: string;
            companyId: string;
            companyName: string;
            avatar: string | null;
            role: string;
            roleId: string;
            employmentStatus: any;
        };
        backendTokens: {
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
        };
        permissions: string[];
    } | {
        status: string;
        requiresVerification: boolean;
        tempToken: string;
        message: string;
    }>;
    verifyCode(tempToken: string, code: string, ip: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            role: string;
            companyId: string;
            avatar: string | null;
            roleId: string;
        };
        backendTokens: {
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
        };
        permissions: string[];
    } | {
        user: {
            id: any;
            firstName: any;
            lastName: any;
            email: string;
            companyId: string;
            companyName: string;
            avatar: string | null;
            role: string;
            roleId: string;
            employmentStatus: any;
        } | {
            id: any;
            firstName: any;
            lastName: any;
            email: string;
            companyId: string;
            companyName: string;
            avatar: string | null;
            role: string;
            roleId: string;
            employmentStatus: any;
        };
        backendTokens: {
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
        };
        permissions: string[];
    }>;
    refreshToken(user: JwtType): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    }>;
    private validateUser;
    logout(response: Response): Promise<void>;
}
