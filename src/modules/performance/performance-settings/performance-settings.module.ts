import { Module } from '@nestjs/common';
import { PerformanceSettingsService } from './performance-settings.service';
import { PerformanceSettingsController } from './performance-settings.controller';

@Module({
  controllers: [PerformanceSettingsController],
  providers: [PerformanceSettingsService],
})
export class PerformanceSettingsModule {}
