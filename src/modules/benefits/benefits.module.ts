import { Module } from '@nestjs/common';
import { BenefitGroupsModule } from './benefit-groups/benefit-groups.module';
import { BenefitPlanModule } from './benefit-plan/benefit-plan.module';

@Module({
  controllers: [],
  providers: [],
  imports: [BenefitGroupsModule, BenefitPlanModule],
})
export class BenefitsModule {}
