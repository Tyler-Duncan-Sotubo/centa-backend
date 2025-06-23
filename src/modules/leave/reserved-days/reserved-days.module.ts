import { Module } from '@nestjs/common';
import { ReservedDaysService } from './reserved-days.service';
import { ReservedDaysController } from './reserved-days.controller';

@Module({
  controllers: [ReservedDaysController],
  providers: [ReservedDaysService],
  exports: [ReservedDaysService],
})
export class ReservedDaysModule {}
