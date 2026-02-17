import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { and, eq } from 'drizzle-orm';
import { performanceGoals } from '../goals/schema/performance-goals.schema';
import { CycleService } from '../cycle/cycle.service';
import { CompanyService } from 'src/modules/core/company/company.service';
import { format } from 'date-fns';

@Injectable()
export class GoalRolloverCronService {
  private readonly logger = new Logger(GoalRolloverCronService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly companyService: CompanyService,
    private readonly cycleService: CycleService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleRollover() {
    const companies = await this.companyService.getAllCompanies();
    const today = format(new Date(), 'yyyy-MM-dd');

    for (const company of companies) {
      try {
        const lastCycle = await this.cycleService.getLastCycle(company.id);
        if (!lastCycle) continue;

        // only roll when we are inside a NEW cycle
        if (lastCycle.startDate > today) continue;

        // find previous cycle
        const cycles = await this.cycleService.findAll(company.id);
        const sorted = cycles.sort((a, b) =>
          a.startDate.localeCompare(b.startDate),
        );

        const index = sorted.findIndex((c) => c.id === lastCycle.id);
        if (index <= 0) continue;

        const previousCycle = sorted[index - 1];

        /**
         * ---------------------------------------------------
         * FIND RECURRING GOALS IN OLD CYCLE
         * ---------------------------------------------------
         */
        const goals = await this.db
          .select()
          .from(performanceGoals)
          .where(
            and(
              eq(performanceGoals.companyId, company.id),
              eq(performanceGoals.cycleId, previousCycle.id),
              eq(performanceGoals.isRecurring, true),
              eq(performanceGoals.isArchived, false),
            ),
          );

        if (!goals.length) continue;

        /**
         * ---------------------------------------------------
         * CLONE INTO NEW CYCLE
         * ---------------------------------------------------
         */
        for (const goal of goals) {
          try {
            await this.db.insert(performanceGoals).values({
              title: goal.title,
              description: goal.description,
              companyId: company.id,
              cycleId: lastCycle.id,
              employeeId: goal.employeeId,
              employeeGroupId: goal.employeeGroupId,
              startDate: lastCycle.startDate,
              dueDate: lastCycle.endDate,
              weight: goal.weight,
              assignedBy: goal.assignedBy,
              status: 'draft',
              isRecurring: true,
              assignedAt: new Date(),
            });
          } catch (e) {
            this.logger.error(
              `Failed to rollover goal ${goal.id} for ${company.name}`,
              e?.stack ?? String(e),
            );
          }
        }

        this.logger.log(
          `Rolled ${goals.length} goals → ${lastCycle.name} (${company.name})`,
        );
      } catch (e: any) {
        this.logger.error(
          `Rollover failed for ${company.name}`,
          e?.stack ?? String(e),
        );
      }
    }
  }
}
