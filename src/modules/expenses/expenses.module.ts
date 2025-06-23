import { Module } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { ExpensesSettingsService } from './settings/expense-settings.service';
import { ExpenseSettingsModule } from './settings/expense-settings.module';

@Module({
  controllers: [ExpensesController],
  providers: [ExpensesService, ExpensesSettingsService],
  exports: [ExpensesService],
  imports: [ExpenseSettingsModule],
})
export class ExpensesModule {}
