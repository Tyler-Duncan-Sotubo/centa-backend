import { Module } from '@nestjs/common';
import { CycleService } from './cycle.service';
import { CycleController } from './cycle.controller';
import { AutoCreateCycleCronService } from './auto-create-cycle.cron';
import { PerformanceSettingsService } from '../performance-settings/performance-settings.service';

@Module({
  controllers: [CycleController],
  providers: [
    CycleService,
    AutoCreateCycleCronService,
    PerformanceSettingsService,
  ],
  exports: [CycleService, AutoCreateCycleCronService],
})
export class CycleModule {}
