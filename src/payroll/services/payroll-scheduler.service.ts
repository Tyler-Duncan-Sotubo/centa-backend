import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { isSameDay, parseISO } from 'date-fns';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import { eq } from 'drizzle-orm';
import { PayrollService } from './payroll.service';
import { payGroups } from 'src/drizzle/schema/payroll.schema';
import { paySchedules } from 'src/drizzle/schema/company.schema';

@Injectable()
export class PayrollSchedulerService {
  private readonly logger = new Logger(PayrollSchedulerService.name);

  constructor(
    private readonly payrollService: PayrollService,
    @Inject(DRIZZLE) private db: db,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handlePayrollRun() {
    const today = new Date();

    const groupsWithSchedules = await this.db
      .select({
        group_id: payGroups.id,
        company_id: payGroups.company_id,
        group_name: payGroups.name,
        pay_schedule: paySchedules.paySchedule,
      })
      .from(payGroups)
      .innerJoin(paySchedules, eq(payGroups.pay_schedule_id, paySchedules.id))
      .execute();

    for (const {
      group_id,
      company_id,
      group_name,
      pay_schedule,
    } of groupsWithSchedules) {
      // Adjust pay_schedule to only check the date, excluding the time
      const adjustedPaySchedule = (pay_schedule as string[]).map(
        (date) => parseISO(date).setHours(0, 0, 0, 0), // Set time to midnight for comparison
      );

      // Check if today is 2 days before any of the scheduled paydays
      const shouldRunToday = adjustedPaySchedule.some((payDate) => {
        const twoDaysBeforePayday = new Date(payDate);
        twoDaysBeforePayday.setDate(twoDaysBeforePayday.getDate() - 2);
        return isSameDay(today, twoDaysBeforePayday);
      });

      if (!shouldRunToday) continue;

      this.logger.log(
        `Running payroll for group ${group_name} in company ${company_id}`,
      );

      try {
        await this.payrollService.calculatePayrollForCompany(
          company_id,
          this.getPayrollMonth(today),
          group_id,
        );
      } catch (err) {
        this.logger.error(`Failed payroll for group ${group_name}`, err.stack);
      }
    }
  }

  private getPayrollMonth(today: Date) {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  }
}
