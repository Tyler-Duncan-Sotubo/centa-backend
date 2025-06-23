import { Module } from '@nestjs/common';
import { RunService } from './run.service';
import { RunController } from './run.controller';
import { BullModule } from '@nestjs/bullmq';
import { SalaryAdvanceService } from '../salary-advance/salary-advance.service';

@Module({
  controllers: [RunController],
  providers: [RunService, SalaryAdvanceService],
  exports: [RunService],
  imports: [
    BullModule.registerQueue({
      name: 'payrollQueue',
    }),
  ],
})
export class RunModule {}
