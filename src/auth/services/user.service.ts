// user.service.ts
import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { db } from '../../drizzle/types/drizzle';
import { CreateUserDto } from '../dto/create-user.dto';
import { users } from '../../drizzle/schema/users.schema';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import * as bcrypt from 'bcryptjs';
import { eq, not, and } from 'drizzle-orm';
import { VerificationService } from './verification.service';
import { companies } from 'src/drizzle/schema/company.schema';
import { JwtService } from '@nestjs/jwt';
import { InviteUserDto } from '../dto/invite-user.dto';
import { ConfigService } from '@nestjs/config';
import { InvitationService } from 'src/notification/services/invitation.service';
import { AwsService } from 'src/config/aws/aws.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { taxConfig } from 'src/drizzle/schema/deductions.schema';
import { OnboardingService } from 'src/organization/services/onboarding.service';
import { salaryBreakdown } from 'src/drizzle/schema/payroll.schema';
import { AuditService } from 'src/audit/audit.service';

@Injectable()
export class UserService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly verificationService: VerificationService,
    private readonly invitation: InvitationService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private awsService: AwsService,
    private onboardingService: OnboardingService,
    private auditService: AuditService,
  ) {}

  async register(dto: CreateUserDto) {
    const company = await this.db
      .insert(companies)
      .values({
        name: dto.company_name,
        country: dto.country,
      })
      .returning({ id: companies.id })
      .execute();

    // Check if the user already exists
    const userExists = await this.findUserByEmail(dto.email.toLowerCase());

    if (userExists) {
      throw new BadRequestException('User already exists.');
    }

    // Hash the password once and prepare user data
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Prepare user data, handle optional first_name and last_name
    const userData: any = {
      email: dto.email.toLowerCase(),
      password: hashedPassword,
      role: 'super_admin',
      company_id: company[0].id,
    };

    // Insert user and role in a single transaction to simplify and ensure consistency
    const newUser = await this.db.transaction(async (trx) => {
      // Insert the user into 'users' table
      const [user] = await trx
        .insert(users)
        .values(userData)
        .returning({
          id: users.id,
          email: users.email,
        })
        .execute();

      await trx.insert(taxConfig).values({
        apply_nhf: false,
        apply_pension: true,
        apply_paye: true,
        company_id: company[0].id,
      });

      await trx.insert(salaryBreakdown).values({
        company_id: company[0].id,
        basic: '50.0',
        housing: '30.0',
        transport: '20.0',
      });

      return user; // Return the created user object
    });

    // Log the company creation
    await this.auditService.logAction(
      `Created ${dto.company_name}`,
      `Company`,
      newUser.id,
    );

    // Create onboarding tasks
    await this.onboardingService.createOnboardingTasks(company[0].id);

    // Generate verification token
    await this.verificationService.generateVerificationToken(newUser.id);

    return {
      user: newUser,
    };
  }

  //Invite User to Company Assign Admin Role
  async inviteUser(dto: InviteUserDto, company_id: string) {
    const token = this.jwtService.sign({
      email: dto.email,
      role: dto.role,
      company_id,
    });

    const inviteLink = `${this.configService.get(
      'CLIENT_URL',
    )}/auth/invite/${token}`;

    await this.invitation.sendInvitationEmail(dto.email, dto.name, inviteLink);
  }

  async verifyInvite(token: string) {
    const decoded = await this.jwtService.verify(token);
    const { email, company_id, role } = decoded;

    // Check if the user already exists
    let user = await this.findUserByEmail(email);

    if (!user) {
      // Create a new user if not exists
      const [newUser] = await this.db
        .insert(users)
        .values({
          email: email,
          role: role,
          company_id: company_id,
          password: await bcrypt.hash('defaultPassword123', 10), // Ask user to reset later
        })
        .returning()
        .execute();

      user = newUser; // Assign newly created user
    } else {
      // Update the role of the existing user
      await this.db
        .update(users)
        .set({ role })
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
        role: users.role,
        first_name: users.first_name,
        last_name: users.last_name,
        avatar: users.avatar,
      })
      .from(users)
      .where(
        and(eq(users.company_id, company_id), not(eq(users.role, 'employee'))),
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
        role: dto.role,
        first_name: dto.name,
      })
      .where(eq(users.id, user_id))
      .execute();
  }

  async getUserProfile(user_id: string) {
    const user = await this.db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        first_name: users.first_name,
        last_name: users.last_name,
        avatar: users.avatar,
      })
      .from(users)
      .where(eq(users.id, user_id))
      .execute();

    if (user.length === 0) {
      new BadRequestException('User not found.');
    }

    return user[0];
  }

  // edit user profile
  async UpdateUserProfile(user_id: string, dto: UpdateProfileDto) {
    const userAvatar = await this.awsService.uploadImageToS3(
      dto.email,
      'avatar',
      dto.avatar,
    );

    await this.db
      .update(users)
      .set({
        first_name: dto.first_name,
        last_name: dto.last_name,
        avatar: userAvatar,
      })
      .where(eq(users.id, user_id))
      .execute();

    return { message: 'Profile updated successfully' };
  }
}
