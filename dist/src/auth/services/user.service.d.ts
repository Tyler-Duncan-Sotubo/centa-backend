import { db } from '../../drizzle/types/drizzle';
import { CreateUserDto } from '../dto/create-user.dto';
import { VerificationService } from './verification.service';
import { JwtService } from '@nestjs/jwt';
import { InviteUserDto } from '../dto/invite-user.dto';
import { ConfigService } from '@nestjs/config';
import { InvitationService } from 'src/notification/services/invitation.service';
import { AwsService } from 'src/config/aws/aws.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { OnboardingService } from 'src/organization/services/onboarding.service';
import { AuditService } from 'src/audit/audit.service';
export declare class UserService {
    private db;
    private readonly verificationService;
    private readonly invitation;
    private jwtService;
    private configService;
    private awsService;
    private onboardingService;
    private auditService;
    constructor(db: db, verificationService: VerificationService, invitation: InvitationService, jwtService: JwtService, configService: ConfigService, awsService: AwsService, onboardingService: OnboardingService, auditService: AuditService);
    register(dto: CreateUserDto): Promise<{
        user: {
            id: string;
            email: string;
        };
    }>;
    inviteUser(dto: InviteUserDto, company_id: string): Promise<void>;
    verifyInvite(token: string): Promise<{
        message: string;
        email: any;
    }>;
    findUserByEmail(email: string): Promise<{
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string;
        password: string;
        role: "admin" | "hr_manager" | "employee" | "payroll_specialist" | "super_admin";
        plan: string | null;
        is_verified: boolean | null;
        last_login: Date | null;
        created_at: Date;
        updated_at: Date;
        avatar: string | null;
        company_id: string | null;
    }>;
    companyUsers(company_id: string): Promise<{
        id: string;
        email: string;
        role: "admin" | "hr_manager" | "employee" | "payroll_specialist" | "super_admin";
        first_name: string | null;
        last_name: string | null;
        avatar: string | null;
    }[]>;
    editUserRole(user_id: string, dto: InviteUserDto): Promise<void>;
    getUserProfile(user_id: string): Promise<{
        id: string;
        email: string;
        role: "admin" | "hr_manager" | "employee" | "payroll_specialist" | "super_admin";
        first_name: string | null;
        last_name: string | null;
        avatar: string | null;
    }>;
    UpdateUserProfile(user_id: string, dto: UpdateProfileDto): Promise<{
        message: string;
    }>;
}
