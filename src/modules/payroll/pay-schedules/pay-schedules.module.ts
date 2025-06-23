import { Module } from '@nestjs/common';
import { PaySchedulesService } from './pay-schedules.service';
import { PaySchedulesController } from './pay-schedules.controller';

@Module({
  controllers: [PaySchedulesController],
  providers: [PaySchedulesService],
  exports: [PaySchedulesService],
})
export class PaySchedulesModule {}
