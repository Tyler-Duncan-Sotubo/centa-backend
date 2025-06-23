import { Module } from '@nestjs/common';
import { LeaveBalanceService } from './leave-balance.service';
import { LeaveBalanceController } from './leave-balance.controller';
import { LeaveAccrualCronService } from './leave-accrual.cron';

@Module({
  controllers: [LeaveBalanceController],
  providers: [LeaveBalanceService, LeaveAccrualCronService],
  exports: [LeaveBalanceService],
})
export class LeaveBalanceModule {}
