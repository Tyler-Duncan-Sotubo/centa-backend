import { Module } from '@nestjs/common';
import { BlockedDaysService } from './blocked-days.service';
import { BlockedDaysController } from './blocked-days.controller';

@Module({
  controllers: [BlockedDaysController],
  providers: [BlockedDaysService],
  exports: [BlockedDaysService],
})
export class BlockedDaysModule {}
