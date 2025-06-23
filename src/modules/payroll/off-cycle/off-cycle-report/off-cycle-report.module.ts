import { Module } from '@nestjs/common';
import { OffCycleReportService } from './off-cycle-report.service';
import { OffCycleReportController } from './off-cycle-report.controller';

@Module({
  controllers: [OffCycleReportController],
  providers: [OffCycleReportService],
})
export class OffCycleReportModule {}
