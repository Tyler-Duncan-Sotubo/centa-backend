import { Module } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { GoalsController } from './goals.controller';
import { GoalActivityService } from './goal-activity.service';
import { PerformancePolicyController } from './goal-policy.controller';
import { PolicyService } from './goal-policy.service';
import { BullModule } from '@nestjs/bullmq';
import { GoalCheckinCronService } from './goal-checkin-cron.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'emailQueue',
    }),
  ],
  controllers: [GoalsController, PerformancePolicyController],
  providers: [
    GoalsService,
    GoalActivityService,
    PolicyService,
    GoalCheckinCronService,
  ],
})
export class GoalsModule {}
