import { Module } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { GoalsController } from './goals.controller';
import { GoalActivityService } from './goal-activity.service';

@Module({
  controllers: [GoalsController],
  providers: [GoalsService, GoalActivityService],
})
export class GoalsModule {}
