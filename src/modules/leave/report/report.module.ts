import { Module } from '@nestjs/common';
import { LeaveReportService } from './report.service';
import { ReportController } from './report.controller';
import { LeaveBalanceService } from '../balance/leave-balance.service';

@Module({
  controllers: [ReportController],
  providers: [LeaveReportService, LeaveBalanceService],
})
export class ReportModule {}
