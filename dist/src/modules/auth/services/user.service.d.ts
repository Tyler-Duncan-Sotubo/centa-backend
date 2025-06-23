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
    constructor(db: db, verificationService: VerificationService, jwtService: JwtService, configService: ConfigService, awsService: AwsService, invitation: InvitationService, companySettingsService: CompanySettingsService, permissionService: PermissionsService, permissionSeedQueue: Queue);
    register(dto: RegisterDto): Promise<{
        user: {
            id: string;
            email: string;
        };
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
    }>;
}
