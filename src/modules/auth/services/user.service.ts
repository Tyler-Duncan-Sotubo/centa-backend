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
  users,
} from 'src/drizzle/schema';
import { RegisterDto } from '../dto/register-user.dto';
import { InvitationService } from 'src/modules/notification/services/invitation.service';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { PermissionsService } from '../permissions/permissions.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

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
  ) {}

  async register(dto: RegisterDto) {
    // 1a) Check if the company already exists
    const existingCompany = await this.db
      .select()
      .from(companies)
      .where(eq(companies.domain, dto.domain.toLowerCase()))
      .execute();

    // Check if the company already exists
    if (existingCompany.length > 0) {
      throw new BadRequestException('Company already exists.');
    }

    // 2) Prevent duplicate user
    if (await this.findUserByEmail(dto.email.toLowerCase())) {
      throw new BadRequestException('User already exists.');
    }

    // 1b) Create the company tenant
    const [company] = await this.db
      .insert(companies)
      .values({
        name: dto.companyName,
        country: dto.country,
        domain: dto.domain.toLowerCase(),
      })
      .returning({ id: companies.id, name: companies.name })
      .execute();

    // 3) Hash password
    const hashed = await bcrypt.hash(dto.password, 10);

    // 3a) Check if the super admin role exists
    const roles = await this.permissionService.createDefaultRoles(company.id);

    const role = roles.find((role) => role.name === dto.role);

    if (!role) {
      throw new BadRequestException('role not found.');
    }

    // 4) Insert user in same transaction as company?
    const newUser = await this.db.transaction(async (trx) => {
      const [user] = await trx
        .insert(users)
        .values({
          email: dto.email.toLowerCase(),
          firstName: dto.firstName,
          lastName: dto.lastName,
          password: hashed,
          companyId: company.id,
          companyRoleId: role.id,
        })
        .returning({ id: users.id, email: users.email })
        .execute();

      await trx.insert(companyFileFolders).values({
        companyId: company.id,
        name: 'Account Documents',
        isSystem: true,
      });

      // 5) Register company Location
      await trx.insert(companyLocations).values({
        name: 'Head Office',
        country: dto.country,
        companyId: company.id,
        isPrimary: true,
      });

      return user;
    });

    await this.companySettingsService.setSettings(company.id);

    await this.permissionSeedQueue.add(
      'seed-permissions',
      { companyId: company.id },
      { delay: 3000 }, // wait 3s before executing
    );

    await this.verificationService.generateVerificationToken(
      newUser.id,
      company.name,
    );

    return { user: newUser, company: { id: company.id, domain: dto.domain } };
  }

  // async register(dto: RegisterDto) {
  //   // 1) Prevent duplicate company
  //   const existingCompany = await this.db
  //     .select()
  //     .from(companies)
  //     .where(eq(companies.domain, dto.domain.toLowerCase()))
  //     .execute();

  //   if (existingCompany.length > 0) {
  //     throw new BadRequestException('Company already exists.');
  //   }

  //   // 2) Prevent duplicate user
  //   if (await this.findUserByEmail(dto.email.toLowerCase())) {
  //     throw new BadRequestException('User already exists.');
  //   }

  //   const hashed = await bcrypt.hash(dto.password, 10);

  //   const result = await this.db.transaction(async (trx) => {
  //     // Create company
  //     const [company] = await trx
  //       .insert(companies)
  //       .values({
  //         name: dto.companyName,
  //         country: dto.country,
  //         domain: dto.domain.toLowerCase(),
  //       })
  //       .returning({ id: companies.id })
  //       .execute();

  //     console.log('Company created:', company);

  //     // 3a) Check if the super admin role exists
  //     const roles = await this.permissionService.createDefaultRoles(company.id);
  //     const superAdminRole = roles.find((role) => role.name === 'super_admin');

  //     console.log('Roles created:', roles);

  //     if (!superAdminRole) {
  //       throw new BadRequestException('Super admin role not found.');
  //     }

  //     // Create user
  //     const [user] = await trx
  //       .insert(users)
  //       .values({
  //         email: dto.email.toLowerCase(),
  //         password: hashed,
  //         companyId: company.id,
  //         companyRoleId: superAdminRole.id,
  //       })
  //       .returning({ id: users.id, email: users.email })
  //       .execute();

  //     console.log('User created:', user);

  //     // Create company location
  //     await trx.insert(companyLocations).values({
  //       name: 'Head Office',
  //       country: dto.country,
  //       companyId: company.id,
  //       isPrimary: true,
  //     });

  //     return { user, company: { id: company.id, domain: dto.domain } };
  //   });

  //   await this.companySettingsService.setSettings(result.company.id);
  //   await this.permissionSeedQueue.add('seed-permissions', {
  //     companyId: result.company.id,
  //   });

  //   await this.verificationService.generateVerificationToken(result.user.id);

  //   return result;
  // }

  //Invite User to Company Assign Admin Role

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

  // edit user profile
  async UpdateUserProfile(user_id: string, dto: UpdateProfileDto) {
    const userAvatar = await this.awsService.uploadImageToS3(
      dto.email,
      'avatar',
      dto.avatar,
    );

    const updatedProfile = await this.db
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
      })
      .execute();

    return updatedProfile[0];
  }
}
