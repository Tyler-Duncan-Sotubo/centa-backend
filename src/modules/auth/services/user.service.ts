// user.service.ts
import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { eq, not, and } from 'drizzle-orm';
import { VerificationService } from './verification.service';
import { JwtService } from '@nestjs/jwt';
import { InviteUserDto } from '../dto/invite-user.dto';
import { ConfigService } from '@nestjs/config';
import { AwsService } from 'src/common/aws/aws.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import {
  companies,
  companyFileFolders,
  companyLocations,
  companyRoles,
  employees,
  users,
} from 'src/drizzle/schema';
import { RegisterDto } from '../dto/register-user.dto';
import { InvitationService } from 'src/modules/notification/services/invitation.service';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { PermissionsService } from '../permissions/permissions.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PerformanceTemplatesService } from 'src/modules/performance/templates/templates.service';
import { FeedbackQuestionService } from 'src/modules/performance/feedback/feedback-questions/feedback-question.service';
import { FeedbackSettingsService } from 'src/modules/performance/feedback/feedback-settings/feedback-settings.service';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class UserService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly verificationService: VerificationService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private awsService: AwsService,
    private readonly invitation: InvitationService,
    private readonly companySettingsService: CompanySettingsService,
    private readonly permissionService: PermissionsService,
    @InjectQueue('permission-seed-queue') private permissionSeedQueue: Queue,
    private readonly performance: PerformanceTemplatesService,
    private readonly feedbackQuestionService: FeedbackQuestionService,
    private readonly feedbackSettingService: FeedbackSettingsService,
    private readonly cacheService: CacheService,
  ) {}

  private async checkCompanyExists(domain: string): Promise<void> {
    const existingCompany = await this.db
      .select()
      .from(companies)
      .where(eq(companies.domain, domain.toLowerCase()))
      .execute();

    if (existingCompany.length > 0) {
      throw new BadRequestException('Company already exists.');
    }
  }

  private async checkUserExists(email: string): Promise<void> {
    const existingUser = await this.findUserByEmail(email.toLowerCase());
    if (existingUser) {
      throw new BadRequestException('User already exists.');
    }
  }

  private async createCompany(
    dto: RegisterDto,
  ): Promise<{ id: string; name: string }> {
    const [company] = await this.db
      .insert(companies)
      .values({
        name: dto.companyName,
        country: dto.country,
        domain: dto.domain.toLowerCase(),
        trialEndsAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
      })
      .returning({ id: companies.id, name: companies.name })
      .execute();

    return company;
  }

  private async createUserAndSetup(
    trx: any,
    company: { id: string; name: string },
    dto: RegisterDto,
  ) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const roles = await this.permissionService.createDefaultRoles(company.id);
    const role = roles.find((role) => role.name === dto.role);

    if (!role) {
      throw new BadRequestException('Role not found.');
    }

    const [user] = await trx
      .insert(users)
      .values({
        email: dto.email.toLowerCase(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        password: hashedPassword,
        companyId: company.id,
        companyRoleId: role.id,
      })
      .returning({ id: users.id, email: users.email })
      .execute();

    if (!user) {
      throw new BadRequestException('User creation failed.');
    }

    await Promise.all([
      trx.insert(companyFileFolders).values({
        companyId: company.id,
        name: 'Account Documents',
        isSystem: true,
      }),

      trx.insert(companyLocations).values({
        name: 'Head Office',
        country: dto.country,
        companyId: company.id,
        isPrimary: true,
      }),
      this.companySettingsService.setSettings(company.id),
      this.performance.seedDefaultTemplate(company.id),
      this.feedbackQuestionService.seedFeedbackQuestions(company.id),
      this.feedbackSettingService.create(company.id),
    ]);

    return user;
  }

  private async postRegistration(
    company: { id: string; name: string },
    user: { id: string },
  ): Promise<void> {
    await this.permissionSeedQueue.add(
      'seed-permissions',
      { companyId: company.id },
      { delay: 3000 },
    );

    await this.permissionSeedQueue.add(
      'seed-permissions',
      { companyId: company.id },
      { delay: 3000 },
    );

    await this.verificationService.generateVerificationToken(
      user.id,
      company.name,
    );
  }

  async register(dto: RegisterDto) {
    await this.checkCompanyExists(dto.domain);
    await this.checkUserExists(dto.email);

    const company = await this.createCompany(dto);

    const user = await this.db.transaction(async (trx) => {
      return await this.createUserAndSetup(trx, company, dto);
    });

    await this.postRegistration(company, user);

    return { user, company: { id: company.id, domain: dto.domain } };
  }

  async inviteUser(dto: InviteUserDto, company_id: string) {
    const company = await this.db
      .select({
        name: companies.name,
      })
      .from(companies)
      .where(eq(companies.id, company_id))
      .execute();

    const token = this.jwtService.sign({
      email: dto.email,
      companyRoleId: dto.companyRoleId,
      company_id,
    });

    const inviteLink = `${this.configService.get(
      'CLIENT_URL',
    )}/auth/invite/${token}`;

    await this.invitation.sendInvitationEmail(
      dto.email,
      dto.name,
      company[0].name,
      dto.companyRoleId,
      inviteLink,
    );

    return {
      token,
      company_name: company[0].name,
    };
  }

  async verifyInvite(token: string) {
    const decoded = await this.jwtService.verify(token);
    const { email, company_id, companyRoleId } = decoded;

    // Check if the user already exists
    let user = await this.findUserByEmail(email);

    const userData: any = {
      email: email,
      password: await bcrypt.hash('defaultPassword123', 10),
      companyRoleId: companyRoleId,
      companyId: company_id,
    };

    if (!user) {
      // Create a new user if not exists
      const [newUser] = await this.db
        .insert(users)
        .values(userData)
        .returning()
        .execute();

      user = newUser; // Assign newly created user
    } else {
      // Update the role of the existing user
      await this.db
        .update(users)
        .set({ companyRoleId })
        .where(eq(users.email, email))
        .execute();
    }

    if (!user) {
      throw new Error('User creation or retrieval failed.');
    }

    return { message: 'Invitation accepted', email }; //
  }

  /**
   * Finds a user by their email address.
   *
   * @param email - The email address of the user to find.
   * @returns A promise that resolves to the user object if found, or undefined if not found.
   *
   */
  async findUserByEmail(email: string) {
    return this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
      .execute()
      .then((res) => res[0]);
  }

  async companyUsers(company_id: string) {
    const allUsers = await this.db
      .select({
        id: users.id,
        email: users.email,
        role: companyRoles.name,
        first_name: users.firstName,
        last_name: users.lastName,
        avatar: users.avatar,
        lastLogin: users.lastLogin,
      })
      .from(users)
      .innerJoin(companyRoles, eq(users.companyRoleId, companyRoles.id))
      .where(
        and(
          eq(users.companyId, company_id),
          not(eq(companyRoles.name, 'employee')),
        ),
      )
      .execute();

    if (allUsers.length === 0) {
      new BadRequestException('No users found for this company.');
    }

    return allUsers;
  }

  // edit user role by super admin
  async editUserRole(user_id: string, dto: InviteUserDto) {
    await this.db
      .update(users)
      .set({
        companyRoleId: dto.companyRoleId,
        firstName: dto.name,
      })
      .where(eq(users.id, user_id))
      .execute();
  }

  async getUserProfile(user_id: string) {
    const user = await this.db
      .select({
        id: users.id,
        email: users.email,
        role: companyRoles.name,
        first_name: users.firstName,
        last_name: users.lastName,
        avatar: users.avatar,
      })
      .from(users)
      .innerJoin(companyRoles, eq(users.companyRoleId, companyRoles.id))
      .where(eq(users.id, user_id))
      .execute();

    if (user.length === 0) {
      new BadRequestException('User not found.');
    }

    return user[0];
  }

  async UpdateUserProfile(user_id: string, dto: UpdateProfileDto) {
    const userAvatar = await this.awsService.uploadImageToS3(
      dto.email,
      'avatar',
      dto.avatar,
    );

    return await this.db.transaction(async (tx) => {
      // 1) update users
      const [userRow] = await tx
        .update(users)
        .set({
          firstName: dto.first_name,
          lastName: dto.last_name,
          avatar: userAvatar,
        })
        .where(eq(users.id, user_id))
        .returning({
          id: users.id,
          email: users.email,
          first_name: users.firstName,
          last_name: users.lastName,
          avatar: users.avatar,
          companyId: users.companyId,
        })
        .execute();

      // 2) mirror names into employees (if you want employees to remain the source of truth for names)
      await tx
        .update(employees)
        .set({
          firstName: dto.first_name,
          lastName: dto.last_name,
        })
        .where(eq(employees.userId, user_id))
        .execute();

      // 🔔 Invalidate all employee-by-user caches under this company
      await this.cacheService.bumpCompanyVersion(userRow.companyId);

      return userRow; // or shape however your controller expects
    });
  }
}
