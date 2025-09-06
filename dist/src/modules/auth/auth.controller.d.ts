import { UserService, TokenGeneratorService, AuthService, VerificationService, PasswordResetService } from './services';
import { LoginDto, PasswordResetDto, RequestPasswordResetDto, TokenDto, VerifyLoginDto } from './dto';
import { Response } from 'express';
import { User } from 'src/common/types/user.type';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtType } from './types/user.type';
import { RegisterDto } from './dto/register-user.dto';
import { LoginVerificationService } from './services/login-verification.service';
export declare class AuthController {
    private readonly auth;
    private readonly user;
    private readonly token;
    private readonly verification;
    private readonly password;
    private readonly loginVerification;
    constructor(auth: AuthService, user: UserService, token: TokenGeneratorService, verification: VerificationService, password: PasswordResetService, loginVerification: LoginVerificationService);
    Register(dto: RegisterDto): Promise<{
        user: any;
        company: {
            id: string;
            domain: string;
        };
    }>;
    Invite(dto: InviteUserDto, user: User): Promise<{
        token: string;
        company_name: string;
    }>;
    AcceptInvite(token: string): Promise<{
        message: string;
        email: any;
    }>;
    EditUserRole(dto: InviteUserDto, id: string): Promise<void>;
    login(dto: LoginDto, res: Response, ip: string): Promise<{
        status: string;
        requiresVerification: boolean;
        tempToken: string;
        message: string;
    } | {
        success: boolean;
        message: string;
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
    }>;
    employeeLogin(dto: LoginDto, res: Response, ip: string): Promise<{
        status: string;
        requiresVerification: boolean;
        tempToken: string;
        message: string;
    } | {
        success: boolean;
        message: string;
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
    }>;
    refreshToken(user: JwtType): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    }>;
    Logout(response: Response): Promise<void>;
    GetUser(user: User): Promise<User>;
    GetCompanyUsers(user: User): Promise<{
        id: string;
        email: string;
        role: string;
        first_name: string | null;
        last_name: string | null;
        avatar: string | null;
        lastLogin: Date | null;
    }[]>;
    resendVerificationEmail(user: User): Promise<string>;
    verifyEmail(dto: TokenDto): Promise<object>;
    passwordReset(dto: RequestPasswordResetDto): Promise<string>;
    resetPassword(token: string, dto: PasswordResetDto, ip: string): Promise<{
        message: string;
    }>;
    resetInvitationPassword(token: string, dto: PasswordResetDto): Promise<{
        message: string;
    }>;
    UpdateProfile(user: User, dto: UpdateProfileDto): Promise<{
        id: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
        avatar: string | null;
        companyId: string;
    }>;
    GetUserProfile(user: User): Promise<{
        id: string;
        email: string;
        role: string;
        first_name: string | null;
        last_name: string | null;
        avatar: string | null;
    }>;
    verifyLogin(dto: VerifyLoginDto, res: Response, ip: string): Promise<{
        success: boolean;
        message: string;
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
    }>;
    resendCode(token: string): Promise<string>;
}
