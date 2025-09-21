import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { CompanySettingsService } from './company-settings.service';
import { Get } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { TaskStatus } from './constants/constants';

@Controller('company-settings')
export class CompanySettingsController extends BaseController {
  constructor(private readonly companySettingsService: CompanySettingsService) {
    super();
  }

  @Post('backfill-onboarding')
  async backfillOnboarding() {
    return this.companySettingsService.backfillOnboardingModulesForAllCompanies();
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
    return this.companySettingsService.getOnboardingVisibility(user.companyId);
  }

  @Get('onboarding-progress/:module')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  async getOnboardingProgress(
    @CurrentUser() user: User,
    @Param('module') module: string,
  ) {
    return this.companySettingsService.getOnboardingModule(
      user.companyId,
      module as 'payroll' | 'company' | 'employees',
    );
  }

  @Post('onboarding-progress')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  async updateOnboardingProgress(
    @CurrentUser() user: User,
    @Body() body: { module: string; task: string; status: TaskStatus },
  ) {
    return this.companySettingsService.setOnboardingTask(
      user.companyId,
      body.module as 'payroll' | 'company' | 'employees',
      body.task,
      body.status,
    );
  }
}
