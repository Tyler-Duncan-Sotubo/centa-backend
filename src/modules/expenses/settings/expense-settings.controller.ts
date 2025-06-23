import {
  Body,
  Controller,
  Get,
  Patch,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ExpensesSettingsService } from './expense-settings.service';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('expense-settings')
export class ExpenseSettingsController extends BaseController {
  constructor(
    private readonly expenseSettingsService: ExpensesSettingsService,
  ) {
    super();
  }

  @Get('')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['expenses.settings'])
  async getAllowanceSettings(@CurrentUser() user: User) {
    return this.expenseSettingsService.getExpenseSettings(user.companyId);
  }

  @Patch('update-expense-setting')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['expenses.settings'])
  async updatePayrollSetting(
    @CurrentUser() user: User,
    @Body('key') key: string,
    @Body('value') value: any,
  ) {
    return this.expenseSettingsService.updateExpenseSetting(
      user.companyId,
      key,
      value,
    );
  }
}
