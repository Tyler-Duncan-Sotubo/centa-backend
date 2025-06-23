import { Module } from '@nestjs/common';
import { LeaveRequestService } from './leave-request.service';
import { LeaveRequestController } from './leave-request.controller';
import { LeaveSettingsService } from '../settings/leave-settings.service';
import { LeaveBalanceService } from '../balance/leave-balance.service';
import { BlockedDaysService } from '../blocked-days/blocked-days.service';
import { ReservedDaysService } from '../reserved-days/reserved-days.service';

@Module({
  controllers: [LeaveRequestController],
  providers: [
    LeaveRequestService,
    LeaveSettingsService,
    LeaveBalanceService,
    BlockedDaysService,
    ReservedDaysService,
  ],
  exports: [LeaveRequestService],
})
export class LeaveRequestModule {}
