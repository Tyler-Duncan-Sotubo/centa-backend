import { Module } from '@nestjs/common';
import { AttendanceSettingsController } from './attendance-settings.controller';
import { AttendanceSettingsService } from './attendance-settings.service';

@Module({
  controllers: [AttendanceSettingsController],
  providers: [AttendanceSettingsService],
  exports: [AttendanceSettingsService],
})
export class AttendanceSettingsModule {}
