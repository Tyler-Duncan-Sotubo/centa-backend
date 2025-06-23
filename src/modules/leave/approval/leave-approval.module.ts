import { Module } from '@nestjs/common';
import { LeaveApprovalService } from './leave-approval.service';
import { LeaveApprovalController } from './leave-approval.controller';
import { LeaveBalanceService } from '../balance/leave-balance.service';
import { LeaveSettingsService } from '../settings/leave-settings.service';

@Module({
  controllers: [LeaveApprovalController],
  providers: [LeaveApprovalService, LeaveBalanceService, LeaveSettingsService],
})
export class LeaveApprovalModule {}
