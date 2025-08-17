import { Module } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { GoalsController } from './goals.controller';
import { GoalActivityService } from './goal-activity.service';
import { PerformancePolicyController } from './goal-policy.controller';
import { PolicyService } from './goal-policy.service';

@Module({
  controllers: [GoalsController, PerformancePolicyController],
  providers: [GoalsService, GoalActivityService, PolicyService],
})
export class GoalsModule {}
