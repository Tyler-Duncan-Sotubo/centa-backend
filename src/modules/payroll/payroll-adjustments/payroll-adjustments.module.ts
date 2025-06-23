import { Module } from '@nestjs/common';
import { PayrollAdjustmentsService } from './payroll-adjustments.service';
import { PayrollAdjustmentsController } from './payroll-adjustments.controller';

@Module({
  controllers: [PayrollAdjustmentsController],
  providers: [PayrollAdjustmentsService],
})
export class PayrollAdjustmentsModule {}
