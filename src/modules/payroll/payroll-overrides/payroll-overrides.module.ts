import { Module } from '@nestjs/common';
import { PayrollOverridesService } from './payroll-overrides.service';
import { PayrollOverridesController } from './payroll-overrides.controller';

@Module({
  controllers: [PayrollOverridesController],
  providers: [PayrollOverridesService],
})
export class PayrollOverridesModule {}
