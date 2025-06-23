import { Module } from '@nestjs/common';
import { BenefitPlanService } from './benefit-plan.service';
import { BenefitPlanController } from './benefit-plan.controller';

@Module({
  controllers: [BenefitPlanController],
  providers: [BenefitPlanService],
})
export class BenefitPlanModule {}
