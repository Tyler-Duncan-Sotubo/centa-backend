import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Res,
  UseGuards,
  Param,
  UseInterceptors,
  Get,
  SetMetadata,
  Patch,
  Ip,
} from '@nestjs/common';
import {
  UserService,
  TokenGeneratorService,
  AuthService,
  VerificationService,
  PasswordResetService,
} from './services';
import {
  LoginDto,
  PasswordResetDto,
  RequestPasswordResetDto,
  TokenDto,
  VerifyLoginDto,
} from './dto';
import { Response } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { ResponseInterceptor } from 'src/common/interceptor/error-interceptor';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuditInterceptor } from 'src/modules/audit/audit.interceptor';
import { Audit } from 'src/modules/audit/audit.decorator';
import { RefreshJwtGuard } from './guards/refresh.guard';
import { JwtType } from './types/user.type';
import { RegisterDto } from './dto/register-user.dto';
import { LoginVerificationService } from './services/login-verification.service';

@UseInterceptors(AuditInterceptor)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly user: UserService,
    private readonly token: TokenGeneratorService,
    private readonly verification: VerificationService,
    private readonly password: PasswordResetService,
    private readonly loginVerification: LoginVerificationService,
  ) {}

  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(ResponseInterceptor)
  @Audit({ action: 'Register', entity: 'Authentication' })
  @Post('register')
  async Register(@Body() dto: RegisterDto) {
    return this.user.register(dto);
  }

  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(ResponseInterceptor)
  @Post('invite')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin'])
  @Audit({ action: 'New User Invite', entity: 'User' })
  async Invite(@Body() dto: InviteUserDto, @CurrentUser() user: User) {
    return this.user.inviteUser(dto, user.companyId);
  }

  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(ResponseInterceptor)
  @Post('invite/:token')
  async AcceptInvite(@Param('token') token: string) {
    return this.user.verifyInvite(token);
  }

  @HttpCode(HttpStatus.OK)
  @UseInterceptors(ResponseInterceptor)
  @UseGuards(JwtAuthGuard)
  @Audit({ action: 'Updated User Role', entity: 'User' })
  @Patch('edit-user-role/:id')
  async EditUserRole(@Body() dto: InviteUserDto, @Param('id') id: string) {
    return this.user.editUserRole(id, dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ) {
    const result = await this.auth.login(
      dto,
      ['super_admin', 'admin', 'hr_manager'],
      ip,
    );

    if ('status' in result) {
      return result; // short-circuit for 2FA setup/verify
    }

    // Destructure only if login is complete
    const { user, backendTokens, permissions } = result;
    // Set cookie or headers as needed:
    res.cookie('Authentication', backendTokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    return {
      success: true,
      message: 'Login successful',
      user,
      backendTokens,
      permissions,
    };
  }

  @Post('employee-login')
  @HttpCode(HttpStatus.OK)
  async employeeLogin(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ) {
    const result = await this.auth.login(dto, ['employee', 'manager'], ip);

    if ('status' in result) {
      return result; // short-circuit for 2FA setup/verify
    }
    // Destructure only if login is complete
    const { user, backendTokens, permissions } = result;
    res.cookie('Authentication', backendTokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    return {
      success: true,
      message: 'Login successful',
      user,
      backendTokens,
      permissions,
    };
  }

  @UseGuards(RefreshJwtGuard)
  @Post('refresh')
  async refreshToken(@CurrentUser() user: JwtType) {
    return await this.auth.refreshToken(user);
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async Logout(@Res({ passthrough: true }) response: Response) {
    return this.auth.logout(response);
  }

  @Get('user')
  @UseGuards(JwtAuthGuard)
  async GetUser(@CurrentUser() user: User) {
    return user;
  }

  @Get('company-users')
  @UseInterceptors(ResponseInterceptor)
  @UseGuards(JwtAuthGuard)
  async GetCompanyUsers(@CurrentUser() user: User) {
    return this.user.companyUsers(user.companyId);
  }

  @Post('resend-verification-email')
  @UseInterceptors(ResponseInterceptor)
  @UseGuards(JwtAuthGuard)
  async resendVerificationEmail(@CurrentUser() user: User) {
    return this.verification.generateVerificationToken(user.id);
  }

  @Post('verify-email')
  @UseInterceptors(ResponseInterceptor)
  async verifyEmail(@Body() dto: TokenDto) {
    return await this.verification.verifyToken(dto);
  }

  @Post('password-reset')
  @Audit({ action: 'Password Reset Request', entity: 'User' })
  @UseInterceptors(ResponseInterceptor)
  async passwordReset(@Body() dto: RequestPasswordResetDto): Promise<string> {
    return this.password.generatePasswordResetToken(dto.email);
  }

  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  @Audit({ action: 'Reset Password', entity: 'User' })
  @UseInterceptors(ResponseInterceptor)
  async resetPassword(
    @Param('token') token: string,
    @Body() dto: PasswordResetDto,
    @Ip() ip: string,
  ): Promise<{ message: string }> {
    return this.password.resetPassword(dto.token, dto.password, ip);
  }

  @HttpCode(HttpStatus.OK)
  @Post('invite-password-reset/:token')
  @UseInterceptors(ResponseInterceptor)
  async resetInvitationPassword(
    @Param('token') token: string,
    @Body() dto: PasswordResetDto,
  ) {
    return this.password.invitationPasswordReset(token, dto.password);
  }

  // Profile
  @HttpCode(HttpStatus.OK)
  @Patch('profile')
  @UseInterceptors(ResponseInterceptor)
  @UseGuards(JwtAuthGuard)
  async UpdateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.user.UpdateUserProfile(user.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Get('profile')
  @UseInterceptors(ResponseInterceptor)
  @UseGuards(JwtAuthGuard)
  async GetUserProfile(@CurrentUser() user: User) {
    return this.user.getUserProfile(user.id);
  }

  // 2FA
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(ResponseInterceptor)
  @Post('verify-code')
  async verifyLogin(
    @Body() dto: VerifyLoginDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ) {
    const result = await this.auth.verifyCode(dto.tempToken, dto.code, ip);
    const { user, backendTokens, permissions } = result;
    // Set cookie or headers as needed:
    res.cookie('Authentication', backendTokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });

    return {
      success: true,
      message: 'Login successful',
      user,
      backendTokens,
      permissions,
    };
  }

  @HttpCode(HttpStatus.OK)
  @UseInterceptors(ResponseInterceptor)
  @Post('resend-code')
  async resendCode(@Body('tempToken') token: string) {
    return this.loginVerification.regenerateVerificationToken(token);
  }
}
