import { Module } from '@nestjs/common';
import { OffCycleService } from './off-cycle.service';
import { OffCycleController } from './off-cycle.controller';
import { OffCycleReportModule } from './off-cycle-report/off-cycle-report.module';

@Module({
  controllers: [OffCycleController],
  providers: [OffCycleService],
  imports: [OffCycleReportModule],
})
export class OffCycleModule {}
