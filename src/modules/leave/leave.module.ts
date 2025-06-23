import { Module } from '@nestjs/common';
import { LeaveTypesModule } from './types/leave-types.module';
import { LeavePolicyModule } from './policy/leave-policy.module';
import { LeaveRequestModule } from './request/leave-request.module';
import { LeaveBalanceModule } from './balance/leave-balance.module';
import { LeaveApprovalModule } from './approval/leave-approval.module';
import { ReportModule } from './report/report.module';
import { LeaveSettingsModule } from './settings/leave-settings.module';
import { BlockedDaysModule } from './blocked-days/blocked-days.module';
import { ReservedDaysModule } from './reserved-days/reserved-days.module';

@Module({
  controllers: [],
  providers: [],
  imports: [
    LeaveTypesModule,
    LeavePolicyModule,
    LeaveRequestModule,
    LeaveBalanceModule,
    LeaveApprovalModule,
    ReportModule,
    LeaveSettingsModule,
    BlockedDaysModule,
    ReservedDaysModule,
  ],
  exports: [
    LeaveTypesModule,
    LeavePolicyModule,
    LeaveRequestModule,
    LeaveBalanceModule,
  ],
})
export class LeaveModule {}
