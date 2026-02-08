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
import { PinoLogger } from 'nestjs-pino';
import { ChecklistService } from 'src/modules/checklist/checklist.service';

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
    private readonly checklist: ChecklistService,
    private readonly logger: PinoLogger,
  ) {}

  private async completeLogin(user: any, ip: string, hasBothGates?: boolean) {
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
        subscriptionPlan: companies.subscriptionPlan,
        trialEndsAt: companies.trialEndsAt,
      })
      .from(users)
      .innerJoin(companyRoles, eq(users.companyRoleId, companyRoles.id))
      .innerJoin(companies, eq(users.companyId, companies.id))
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

    const checklistStatus = await this.checklist.getOverallChecklistStatus(
      updatedUser.companyId,
    );

    const now = Date.now();
    const MS_IN_DAY = 24 * 60 * 60 * 1000;

    const trialEndsAtMs = updatedUser.trialEndsAt
      ? new Date(updatedUser.trialEndsAt).getTime()
      : null;

    const trialDaysLeft = trialEndsAtMs
      ? Math.max(0, Math.ceil((trialEndsAtMs - now) / MS_IN_DAY))
      : null;

    const trialActive = !!trialEndsAtMs && trialEndsAtMs > now;

    const planTag = updatedUser.subscriptionPlan
      ? `plan.${updatedUser.subscriptionPlan}` // e.g. plan.free | plan.pro | plan.enterprise
      : 'plan.free';

    const tags = [
      planTag,
      trialActive ? 'trial.active' : 'trial.expired',
      ...(typeof trialDaysLeft === 'number'
        ? [`trial.days_left:${trialDaysLeft}`]
        : []),
    ];

    const permissions = Array.from(new Set([...permissionKeys, ...tags]));

    const baseResponse = {
      user: updatedUser,
      backendTokens: {
        accessToken,
        refreshToken,
        expiresIn: Date.now() + 1000 * 60 * 10,
      },
      permissions, // <-- includes plan.* and trial.* tags
      checklist: checklistStatus,
    };

    const notAdminOrSuperAdmin = !['admin', 'super_admin'].includes(
      updatedUser.role,
    );

    const employeeOnly = updatedUser.role === 'employee';

    // Handle employee profile
    if (employeeOnly) {
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

    // Handle employee profile
    if (hasBothGates && notAdminOrSuperAdmin) {
      const [profile] = await this.db
        .select({
          id: employees.id,
          userId: users.id,
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

  async login(
    dto: LoginDto,
    context: 'ESS' | 'DASHBOARD' | 'AUTO' = 'AUTO',
    ip: string,
  ) {
    const user = await this.validateUser(dto.email, dto.password);

    const [role] = await this.db
      .select({ name: companyRoles.name, id: companyRoles.id })
      .from(companyRoles)
      .where(eq(companyRoles.id, user.companyRoleId))
      .execute();

    if (!role) {
      this.logger.warn(
        { email: dto.email, ip },
        'Login rejected: role not found',
      );
      throw new BadRequestException('Invalid credentials');
    }

    // fetch permissions for this role in this company
    const loginPermissions =
      await this.permissionsService.getLoginPermissionsByRole(
        user.companyId,
        role.id,
      );

    const hasEssGate = loginPermissions.some((p) => p.key === 'ess.login');
    const hasDashGate = loginPermissions.some(
      (p) => p.key === 'dashboard.login',
    );

    const hasBothGates = hasEssGate && hasDashGate;

    // Must have at least one gate
    if (!hasEssGate && !hasDashGate) {
      this.logger.warn(
        { userId: user.id, email: dto.email, role: role.name, ip },
        'Login rejected: missing both ess.login and dashboard.login',
      );
      throw new BadRequestException('Invalid credentials');
    }

    // If explicit context provided, enforce it; else AUTO choose
    let target: 'ESS' | 'DASHBOARD';
    if (context === 'AUTO') {
      // Prefer dashboard if available (typical)
      target = hasDashGate ? 'DASHBOARD' : 'ESS';
    } else {
      target = context;
    }

    if (target === 'ESS' && !hasEssGate) {
      this.logger.warn(
        { userId: user.id, email: dto.email, role: role.name, ip, target },
        'Login rejected: requested ESS but missing ess.login',
      );
      throw new BadRequestException('Invalid credentials');
    }
    if (target === 'DASHBOARD' && !hasDashGate) {
      this.logger.warn(
        { userId: user.id, email: dto.email, role: role.name, ip, target },
        'Login rejected: requested DASHBOARD but missing dashboard.login',
      );
      throw new BadRequestException('Invalid credentials');
    }

    // 2FA check
    const now = new Date();
    const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
    const hoursSinceLastLogin = lastLogin
      ? (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60)
      : Infinity;

    const companySettings =
      await this.companySettingsService.getTwoFactorAuthSetting(user.companyId);

    if (hoursSinceLastLogin > 72 && companySettings.twoFactorAuth) {
      await this.verifyLogin.generateVerificationToken(user.id);
      const tempToken =
        await this.tokenGeneratorService.generateTempToken(user);

      this.logger.info(
        { userId: user.id, email: dto.email, ip, context },
        '2FA required due to inactivity',
      );

      return {
        status: 'verification_required',
        requiresVerification: true,
        tempToken,
        message: 'Verification code sent',
      };
    }

    this.logger.info(
      { userId: user.id, email: dto.email, role: role.name, ip, context },
      'Login successful',
    );

    return await this.completeLogin(user, ip, hasBothGates);
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
