import { Module } from '@nestjs/common';
import { AppraisalsService } from './appraisals.service';
import { AppraisalsController } from './appraisals.controller';
import { AppraisalCycleService } from './appraisal-cycle.service';
import { AutoCreatePerformanceCronService } from './appraisal.cron';
import { PerformanceSettingsService } from '../performance-settings/performance-settings.service';
import { AppraisalEntriesService } from './appraisal-entries.service';

@Module({
  controllers: [AppraisalsController],
  providers: [
    AppraisalsService,
    AppraisalCycleService,
    AutoCreatePerformanceCronService,
    PerformanceSettingsService,
    AppraisalEntriesService,
  ],
})
export class AppraisalsModule {}
