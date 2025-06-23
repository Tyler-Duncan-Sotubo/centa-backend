import { Module } from '@nestjs/common';
import { ExpensesSettingsService } from './expense-settings.service';
import { ExpenseSettingsController } from './expense-settings.controller';

@Module({
  imports: [],
  controllers: [ExpenseSettingsController],
  providers: [ExpensesSettingsService],
  exports: [ExpensesSettingsService],
})
export class ExpenseSettingsModule {}
