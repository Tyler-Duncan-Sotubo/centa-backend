import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PolicyService } from './goal-policy.service';

@Injectable()
export class GoalCheckinCronService {
  private readonly logger = new Logger(GoalCheckinCronService.name);

  constructor(private readonly policyService: PolicyService) {}

  // runs every week (tweak as needed)
  @Cron(CronExpression.EVERY_WEEK)
  async handleGoalCheckins() {
    this.logger.log('⏰ Running goal check-in scheduler...');
    const result = await this.policyService.processDueGoalCheckins();
    this.logger.log(
      `Processed=${result.processed}, Enqueued=${result.enqueued}, Skipped=${result.skipped}, Advanced=${result.advanced}`,
    );
  }
}
