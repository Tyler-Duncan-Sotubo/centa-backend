import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { companies } from 'src/drizzle/schema/company.schema';
import { AttendanceService } from './attendance.service';

@Injectable()
export class AttendanceSchedulerService {
  private readonly logger = new Logger(AttendanceSchedulerService.name);

  constructor(
    private readonly attendanceService: AttendanceService,
    @Inject(DRIZZLE) private readonly db: db,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_11PM)
  async handleDailyAttendanceSummary() {
    const today = new Date();

    // 🛑 Avoid weekends
    const isWeekend = today.getDay() === 0 || today.getDay() === 6;
    if (isWeekend) {
      this.logger.log('Skipping attendance summary on weekend.');
      return;
    }

    // ✅ Get all companies
    const allCompanies = await this.db.select().from(companies);

    for (const company of allCompanies) {
      const companyId = company.id;

      try {
        this.logger.log(
          `Generating attendance summary for company ${companyId}`,
        );
        await this.attendanceService.saveDailyAttendanceSummary(companyId);
      } catch (err) {
        this.logger.error(
          `Failed to generate summary for company ${companyId}`,
          err.stack,
        );
      }
    }
  }
}
