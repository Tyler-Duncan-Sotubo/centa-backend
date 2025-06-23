import {
  Body,
  Controller,
  Get,
  Patch,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { LeaveSettingsService } from './leave-settings.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('leave-settings')
export class LeaveSettingsController extends BaseController {
  constructor(private readonly settingsService: LeaveSettingsService) {
    super();
  }

  @Get('approval')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.settings'])
  async getLeaveApprovalSetting(@CurrentUser() user: User) {
    return await this.settingsService.getLeaveApprovalSettings(user.companyId);
  }

  @Get('entitlement')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.settings'])
  async getLeaveEntitlementSettings(@CurrentUser() user: User) {
    return await this.settingsService.getLeaveEntitlementSettings(
      user.companyId,
    );
  }

  @Get('eligibility-options')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.settings'])
  async getLeaveEligibilitySettings(@CurrentUser() user: User) {
    return await this.settingsService.getLeaveEligibilitySettings(
      user.companyId,
    );
  }

  @Get('notifications')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.settings'])
  async getLeaveNotificationSettings(@CurrentUser() user: User) {
    return await this.settingsService.getLeaveNotificationSettings(
      user.companyId,
    );
  }

  @Patch('update-leave-setting')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.settings'])
  async updateLeaveSetting(
    @CurrentUser() user: User,
    @Body('key') key: string,
    @Body('value') value: any,
  ) {
    return this.settingsService.updateLeaveSetting(user.companyId, key, value);
  }
}
