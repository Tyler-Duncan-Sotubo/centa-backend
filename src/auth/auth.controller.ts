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
  Put,
} from '@nestjs/common';
import {
  UserService,
  TokenGeneratorService,
  AuthService,
  VerificationService,
  PasswordResetService,
} from './services';
import {
  CreateUserDto,
  LoginDto,
  PasswordResetDto,
  RequestPasswordResetDto,
  TokenDto,
} from './dto';
import { Response } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorator/current-user.decorator';
import { User } from 'src/types/user.type';
import { ResponseInterceptor } from '../config/interceptor/error-interceptor';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuditInterceptor } from 'src/audit/audit.interceptor';
import { Audit } from 'src/audit/audit.decorator';
import { RefreshJwtGuard } from './guards/refresh.guard';
import { JwtType } from './types/user.type';

@UseInterceptors(AuditInterceptor)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly user: UserService,
    private readonly token: TokenGeneratorService,
    private readonly verification: VerificationService,
    private readonly password: PasswordResetService,
  ) {}

  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(ResponseInterceptor)
  @Post('register')
  async Register(@Body() dto: CreateUserDto) {
    return this.user.register(dto);
  }

  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(ResponseInterceptor)
  @Post('invite')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin'])
  @Audit({ action: 'New User Invite', entity: 'User' })
  async Invite(@Body() dto: InviteUserDto, @CurrentUser() user: User) {
    return this.user.inviteUser(dto, user.company_id);
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
  @Put('edit-user-role/:id')
  async EditUserRole(@Body() dto: InviteUserDto, @Param('id') id: string) {
    return this.user.editUserRole(id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async Login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    console.log(LoginDto);
    return this.auth.login(dto, response);
  }

  @UseGuards(RefreshJwtGuard)
  @Post('refresh')
  async refreshToken(
    @CurrentUser() user: JwtType,
    @Res({ passthrough: true }) response: Response,
  ) {
    return await this.auth.refreshToken(user, response);
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
    return this.user.companyUsers(user.company_id);
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
  @Post('reset-password/:token')
  @Audit({ action: 'Reset Password', entity: 'User' })
  @UseInterceptors(ResponseInterceptor)
  async resetPassword(
    @Param('token') token: string,
    @Body() dto: PasswordResetDto,
  ): Promise<{ message: string }> {
    return this.password.resetPassword(token, dto.password);
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
  @Put('profile')
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
}
