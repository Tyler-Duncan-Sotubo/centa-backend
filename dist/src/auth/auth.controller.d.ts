import { UserService, TokenGeneratorService, AuthService, VerificationService, PasswordResetService } from './services';
import { CreateUserDto, LoginDto, PasswordResetDto, RequestPasswordResetDto, TokenDto } from './dto';
import { Response } from 'express';
import { User } from 'src/types/user.type';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtType } from './types/user.type';
export declare class AuthController {
    private readonly auth;
    private readonly user;
    private readonly token;
    private readonly verification;
    private readonly password;
    constructor(auth: AuthService, user: UserService, token: TokenGeneratorService, verification: VerificationService, password: PasswordResetService);
    Register(dto: CreateUserDto): Promise<{
        user: {
            id: string;
            email: string;
        };
    }>;
    Invite(dto: InviteUserDto, user: User): Promise<void>;
    AcceptInvite(token: string): Promise<{
        message: string;
        email: any;
    }>;
    EditUserRole(dto: InviteUserDto, id: string): Promise<void>;
    Login(dto: LoginDto, response: Response): Promise<void>;
    EmployeeLogin(dto: LoginDto, response: Response): Promise<void>;
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
        role: "admin" | "hr_manager" | "employee" | "payroll_specialist" | "super_admin";
        first_name: string | null;
        last_name: string | null;
        avatar: string | null;
    }[]>;
    resendVerificationEmail(user: User): Promise<string>;
    verifyEmail(dto: TokenDto): Promise<object>;
    passwordReset(dto: RequestPasswordResetDto): Promise<string>;
    resetPassword(token: string, dto: PasswordResetDto): Promise<{
        message: string;
    }>;
    resetInvitationPassword(token: string, dto: PasswordResetDto): Promise<{
        message: string;
    }>;
    UpdateProfile(user: User, dto: UpdateProfileDto): Promise<{
        message: string;
    }>;
    GetUserProfile(user: User): Promise<{
        id: string;
        email: string;
        role: "admin" | "hr_manager" | "employee" | "payroll_specialist" | "super_admin";
        first_name: string | null;
        last_name: string | null;
        avatar: string | null;
    }>;
}
