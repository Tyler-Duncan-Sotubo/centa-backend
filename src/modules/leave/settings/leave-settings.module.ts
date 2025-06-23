import { Module } from '@nestjs/common';
import { LeaveSettingsService } from './leave-settings.service';
import { LeaveSettingsController } from './leave-settings.controller';

@Module({
  controllers: [LeaveSettingsController],
  providers: [LeaveSettingsService],
})
export class LeaveSettingsModule {}
