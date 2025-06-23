import { Module } from '@nestjs/common';
import { BenefitGroupsService } from './benefit-groups.service';
import { BenefitGroupsController } from './benefit-groups.controller';

@Module({
  controllers: [BenefitGroupsController],
  providers: [BenefitGroupsService],
})
export class BenefitGroupsModule {}
