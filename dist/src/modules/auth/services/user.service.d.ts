import { VerificationService } from './verification.service';
import { JwtService } from '@nestjs/jwt';
import { InviteUserDto } from '../dto/invite-user.dto';
import { ConfigService } from '@nestjs/config';
import { AwsService } from 'src/common/aws/aws.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { db } from 'src/drizzle/types/drizzle';
import { RegisterDto } from '../dto/register-user.dto';
import { InvitationService } from 'src/modules/notification/services/invitation.service';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { PermissionsService } from '../permissions/permissions.service';
import { Queue } from 'bullmq';
import { PerformanceTemplatesService } from 'src/modules/performance/templates/templates.service';
import { FeedbackQuestionService } from 'src/modules/performance/feedback/feedback-questions/feedback-question.service';
import { FeedbackSettingsService } from 'src/modules/performance/feedback/feedback-settings/feedback-settings.service';
import { CacheService } from 'src/common/cache/cache.service';
export declare class UserService {
    private db;
    private readonly verificationService;
    private jwtService;
    private configService;
    private awsService;
    private readonly invitation;
    private readonly companySettingsService;
    private readonly permissionService;
    private permissionSeedQueue;
    private readonly performance;
    private readonly feedbackQuestionService;
    private readonly feedbackSettingService;
    private readonly cacheService;
    constructor(db: db, verificationService: VerificationService, jwtService: JwtService, configService: ConfigService, awsService: AwsService, invitation: InvitationService, companySettingsService: CompanySettingsService, permissionService: PermissionsService, permissionSeedQueue: Queue, performance: PerformanceTemplatesService, feedbackQuestionService: FeedbackQuestionService, feedbackSettingService: FeedbackSettingsService, cacheService: CacheService);
    private checkCompanyExists;
    private checkUserExists;
    private createCompany;
    private createUserAndSetup;
    private postRegistration;
    register(dto: RegisterDto): Promise<{
        user: any;
        company: {
            id: string;
            domain: string;
        };
    }>;
    inviteUser(dto: InviteUserDto, company_id: string): Promise<{
        token: string;
        company_name: string;
    }>;
    verifyInvite(token: string): Promise<{
        message: string;
        email: any;
    }>;
    findUserByEmail(email: string): Promise<{
        id: string;
        firstName: string | null;
        lastName: string | null;
        email: string;
        password: string;
        plan: string;
        isVerified: boolean;
        lastLogin: Date | null;
        createdAt: Date;
        updatedAt: Date;
        avatar: string | null;
        companyId: string;
        companyRoleId: string;
        verificationCode: string | null;
        verificationCodeExpiresAt: Date | null;
    }>;
    companyUsers(company_id: string): Promise<{
        id: string;
        email: string;
        role: string;
        first_name: string | null;
        last_name: string | null;
        avatar: string | null;
        lastLogin: Date | null;
    }[]>;
    editUserRole(user_id: string, dto: InviteUserDto): Promise<void>;
    getUserProfile(user_id: string): Promise<{
        id: string;
        email: string;
        role: string;
        first_name: string | null;
        last_name: string | null;
        avatar: string | null;
    }>;
    UpdateUserProfile(user_id: string, dto: UpdateProfileDto): Promise<{
        id: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
        avatar: string | null;
        companyId: string;
    }>;
}
