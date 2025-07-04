// auth.service.ts
import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from './user.service';
import * as bcrypt from 'bcryptjs';
import { TokenGeneratorService } from './token-generator.service';
import { LoginDto } from '../dto';
import { db } from 'src/drizzle/types/drizzle';
import { companyRoles, users } from '../schema';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { eq } from 'drizzle-orm';
import { Response } from 'express';
import { AuditService } from 'src/modules/audit/audit.service';
import { JwtType } from '../types/user.type';
import { employees } from 'src/drizzle/schema';
import { companies } from 'src/drizzle/schema';
import { LoginVerificationService } from './login-verification.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly userService: UserService,
    private readonly tokenGeneratorService: TokenGeneratorService,
    private readonly auditService: AuditService,
    private readonly verifyLogin: LoginVerificationService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly companySettingsService: CompanySettingsService,
    private readonly permissionsService: PermissionsService,
  ) {}

  private async completeLogin(user: any, ip: string) {
    // Update lastLogin
    await this.db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id))
      .execute();

    const [updatedUser] = await this.db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: companyRoles.name,
        companyId: users.companyId,
        avatar: users.avatar,
        roleId: users.companyRoleId,
      })
      .from(users)
      .innerJoin(companyRoles, eq(users.companyRoleId, companyRoles.id))
      .where(eq(users.id, user.id))
      .execute();

    // Log login event
    await this.auditService.logAction({
      action: 'Login',
      entity: 'Authentication',
      userId: user.id,
      details: 'User logged in',
      ipAddress: ip,
    });

    // Generate tokens
    const { accessToken, refreshToken } =
      await this.tokenGeneratorService.generateToken(user);

    // Fetch permissions for the employee
    const permissionKeys =
      await this.permissionsService.getPermissionKeysForUser(
        updatedUser.roleId,
      );

    const baseResponse = {
      user: updatedUser,
      backendTokens: {
        accessToken,
        refreshToken,
        expiresIn: Date.now() + 1000 * 60 * 10, //
      },
      permissions: permissionKeys,
    };

    // Handle employee profile
    if (updatedUser.role === 'employee') {
      const [profile] = await this.db
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          email: users.email,
          companyId: companies.id,
          companyName: companies.name,
          avatar: users.avatar,
          role: companyRoles.name,
          roleId: companyRoles.id,
          employmentStatus: employees.employmentStatus,
        })
        .from(employees)
        .innerJoin(users, eq(users.id, employees.userId))
        .innerJoin(companyRoles, eq(users.companyRoleId, companyRoles.id))
        .innerJoin(companies, eq(companies.id, employees.companyId))
        .where(eq(employees.userId, user.id))
        .execute();

      if (!profile) {
        throw new NotFoundException('Employee profile not found');
      }

      return {
        ...baseResponse,
        user: profile,
      };
    }

    return baseResponse;
  }

  async login(dto: LoginDto, allowedRoles: string[], ip: string) {
    const user = await this.validateUser(dto.email, dto.password);

    const [role] = await this.db
      .select({ name: companyRoles.name })
      .from(companyRoles)
      .where(eq(companyRoles.id, user.companyRoleId))
      .execute();

    if (!role || !allowedRoles.includes(role.name)) {
      throw new BadRequestException('Invalid credentials');
    }

    const now = new Date();
    const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;

    // Check if user has a company and if the company requires verification
    const companySettings =
      await this.companySettingsService.getTwoFactorAuthSetting(user.companyId);

    // Check if lastLogin is more than 48 hours ago
    const hoursSinceLastLogin = lastLogin
      ? (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60)
      : Infinity; // force verification if no last login

    if (hoursSinceLastLogin > 48 && companySettings.twoFactorAuth) {
      await this.verifyLogin.generateVerificationToken(user.id);
      const tempToken =
        await this.tokenGeneratorService.generateTempToken(user);

      return {
        status: 'verification_required',
        requiresVerification: true,
        tempToken,
        message: 'Verification code sent',
      };
    }

    return await this.completeLogin(user, ip);
  }

  async verifyCode(tempToken: string, code: string, ip: string) {
    const payload = await this.jwtService.verifyAsync(tempToken, {
      secret: this.configService.get<string>('JWT_SECRET'),
    });

    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, payload.sub))
      .execute();

    if (!user || user.verificationCode !== code) {
      throw new BadRequestException('Invalid verification code');
    }

    if (
      !user.verificationCodeExpiresAt ||
      user.verificationCodeExpiresAt < new Date()
    ) {
      throw new BadRequestException('Verification code expired');
    }

    // Clear verification fields
    await this.db
      .update(users)
      .set({
        verificationCode: null,
        verificationCodeExpiresAt: null,
      })
      .where(eq(users.id, user.id))
      .execute();

    // Log verification success
    return await this.completeLogin(user, ip);
  }

  async refreshToken(user: JwtType) {
    const payload = {
      email: user.email,
      sub: user.sub,
    };

    // Get Tokens
    const { accessToken } =
      await this.tokenGeneratorService.generateToken(payload);

    return {
      accessToken,
      refreshToken: '',
      expiresIn: Date.now() + 1000 * 60 * 10, //
    };
  }

  private async validateUser(email: string, password: string) {
    const user = await this.userService.findUserByEmail(email.toLowerCase());

    if (!user) {
      throw new NotFoundException('Invalid email or password');
    }

    const passwordIsValid = await bcrypt.compare(password, user.password);

    if (!passwordIsValid) {
      throw new BadRequestException('Invalid credentials');
    }

    return user;
  }

  async logout(response: Response) {
    response.clearCookie('Authentication', {
      httpOnly: true,
      secure: true, // Required for HTTPS
      sameSite: 'none',
    });
    response.json({
      success: true,
      message: 'Logout successful',
    });
  }
}
