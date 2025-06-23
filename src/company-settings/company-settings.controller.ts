import {
  Body,
  Controller,
  Patch,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { CompanySettingsService } from './company-settings.service';
import { Get } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('company-settings')
export class CompanySettingsController extends BaseController {
  constructor(private readonly companySettingsService: CompanySettingsService) {
    super();
  }

  @Get('default-manager')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  async getDefaultManager(@CurrentUser() user: User) {
    return this.companySettingsService.getDefaultManager(user.companyId);
  }

  @Patch('default-manager')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  async updateDefaultManager(
    @CurrentUser() user: User,
    @Body() body: { value: string; key: string },
  ) {
    return this.companySettingsService.setSetting(
      user.companyId,
      body.key,
      body.value,
    );
  }

  @Get('two-factor-auth')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  async getTwoFactorAuthSetting(@CurrentUser() user: User) {
    return this.companySettingsService.getTwoFactorAuthSetting(user.companyId);
  }

  @Patch('two-factor-auth')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  async updateTwoFactorAuthSetting(
    @CurrentUser() user: User,
    @Body() body: { value: boolean; key: string },
  ) {
    return this.companySettingsService.setSetting(
      user.companyId,
      body.key,
      body.value,
    );
  }

  @Get('onboarding')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  async getOnboardingStep(@CurrentUser() user: User) {
    return this.companySettingsService.getOnboardingSettings(user.companyId);
  }
}
