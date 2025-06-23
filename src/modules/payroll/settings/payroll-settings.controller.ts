import {
  Body,
  Controller,
  Get,
  Patch,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { PayrollSettingsService } from './payroll-settings.service';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('payroll-settings')
export class PayrollSettingsController extends BaseController {
  constructor(private readonly payrollSettingsService: PayrollSettingsService) {
    super();
  }

  @Get('statutory-deductions')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll_settings.read'])
  async getStatutoryDeductions(@CurrentUser() user: User) {
    return this.payrollSettingsService.payrollSettings(user.companyId);
  }

  @Get('allowance-settings')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll_settings.read'])
  async getAllowanceSettings(@CurrentUser() user: User) {
    return this.payrollSettingsService.allowanceSettings(user.companyId);
  }

  @Get('approval-proration')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll_settings.read'])
  async getApprovalAndProration(@CurrentUser() user: User) {
    return this.payrollSettingsService.getApprovalAndProrationSettings(
      user.companyId,
    );
  }

  @Get('loan-settings')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll_settings.read'])
  async getLoanSettings(@CurrentUser() user: User) {
    return this.payrollSettingsService.getLoanSettings(user.companyId);
  }

  @Get('13th-month')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll_settings.read'])
  async getThirteenthMonthSettings(@CurrentUser() user: User) {
    return this.payrollSettingsService.getThirteenthMonthSettings(
      user.companyId,
    );
  }

  @Patch('update-payroll-setting')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll_settings.manage'])
  async updatePayrollSetting(
    @CurrentUser() user: User,
    @Body('key') key: string,
    @Body('value') value: any,
  ) {
    return this.payrollSettingsService.updatePayrollSetting(
      user.companyId,
      key,
      value,
    );
  }
}
