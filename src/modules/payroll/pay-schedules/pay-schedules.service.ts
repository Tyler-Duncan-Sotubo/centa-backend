import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreatePayScheduleDto } from './dto/create-pay-schedule.dto';
import { paySchedules } from '../schema/pay-schedules.schema';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { and, eq } from 'drizzle-orm';
import { AuditService } from 'src/modules/audit/audit.service';
import axios from 'axios';
import {
  isSaturday,
  addDays,
  isSunday,
  startOfMonth,
  addMonths,
  endOfMonth,
} from 'date-fns';
import { User } from 'src/common/types/user.type';
import { payGroups } from '../schema/pay-groups.schema';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';

@Injectable()
export class PaySchedulesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly companySettings: CompanySettingsService,
  ) {}

  async findOne(scheduleId: string) {
    const paySchedule = await this.db
      .select()
      .from(paySchedules)
      .where(eq(paySchedules.id, scheduleId))
      .execute();

    if (paySchedule.length === 0) {
      throw new BadRequestException('Pay schedule not found');
    }

    return paySchedule[0];
  }

  async getCompanyPaySchedule(companyId: string) {
    const payFrequency = await this.db
      .select()
      .from(paySchedules)
      .where(eq(paySchedules.companyId, companyId))
      .execute();

    return payFrequency;
  }

  async getNextPayDate(companyId: string) {
    const paySchedulesData = await this.db
      .select({
        paySchedule: paySchedules.paySchedule,
      })
      .from(paySchedules)
      .where(eq(paySchedules.companyId, companyId))
      .execute();

    if (paySchedulesData.length === 0) {
      throw new BadRequestException('No pay schedules found for this company');
    }

    const today = new Date();

    const allPayDates = paySchedulesData
      .flatMap((schedule) => schedule.paySchedule)
      .map((date) => new Date(date as string | number | Date))
      .filter((date) => date > today)
      .sort((a, b) => a.getTime() - b.getTime());

    return allPayDates.length > 0 ? allPayDates[0] : null;
  }

  async listPaySchedulesForCompany(companyId: string) {
    const payFrequency = await this.db
      .select({
        payFrequency: paySchedules.payFrequency,
        paySchedules: paySchedules.paySchedule,
        id: paySchedules.id,
      })
      .from(paySchedules)
      .where(eq(paySchedules.companyId, companyId))
      .execute();

    if (payFrequency.length === 0) {
      throw new BadRequestException('No pay schedules found for this company');
    }

    return payFrequency;
  }

  private async isPublicHoliday(
    date: Date,
    countryCode: string,
  ): Promise<boolean> {
    const formattedDate = date.toISOString().split('T')[0]; // Convert to YYYY-MM-DD

    const url = `https://date.nager.at/api/v3/publicholidays/${date.getFullYear()}/${countryCode}`;
    try {
      const response = await axios.get(url);
      const holidays = response.data;
      return holidays.some((holiday: any) => holiday.date === formattedDate);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Adjust pay date if it falls on a weekend or public holiday
   */
  private async adjustForWeekendAndHoliday(
    date: Date,
    countryCode: string,
  ): Promise<Date> {
    let adjustedDate = new Date(date); // Create a mutable copy

    // Step 1: Adjust for weekend
    while (isSaturday(adjustedDate) || isSunday(adjustedDate)) {
      adjustedDate = addDays(adjustedDate, -1);
    }

    // Step 2: Adjust for public holiday (also backwards only)
    while (await this.isPublicHoliday(adjustedDate, countryCode)) {
      adjustedDate = addDays(adjustedDate, -1);
    }

    return adjustedDate;
  }

  /**
   * Generate Pay Schedule based on pay frequency, ensuring it avoids weekends & holidays
   */
  private async generatePaySchedule(
    startDate: Date,
    frequency: string,
    numPeriods = 6,
    countryCode: string,
  ): Promise<Date[]> {
    const schedule: Date[] = [];

    for (let i = 0; i < numPeriods; i++) {
      let payDate: Date;

      switch (frequency) {
        case 'weekly':
          payDate = addDays(startDate, i * 7);
          break;

        case 'biweekly':
          payDate = addDays(startDate, i * 14);
          break;

        case 'semi-monthly':
          const firstHalf = startOfMonth(addMonths(startDate, i));
          const secondHalf = addDays(firstHalf, 14);

          schedule.push(
            await this.adjustForWeekendAndHoliday(firstHalf, countryCode),
            await this.adjustForWeekendAndHoliday(secondHalf, countryCode),
          );
          continue;

        case 'monthly':
          payDate = endOfMonth(addMonths(startDate, i));
          break;

        default:
          throw new Error('Invalid frequency');
      }

      schedule.push(
        await this.adjustForWeekendAndHoliday(payDate, countryCode),
      );
    }

    return schedule;
  }

  async createPayFrequency(companyId: string, dto: CreatePayScheduleDto) {
    const schedule = await this.generatePaySchedule(
      new Date(dto.startDate),
      dto.payFrequency,
      6,
      dto.countryCode,
    );

    try {
      // **Create a new schedule if none exists**
      const paySchedule = await this.db
        .insert(paySchedules)
        .values({
          companyId: companyId,
          payFrequency: dto.payFrequency,
          paySchedule: schedule,
          startDate: dto.startDate,
          weekendAdjustment: dto.weekendAdjustment,
          holidayAdjustment: dto.holidayAdjustment,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()
        .execute();

      // make onboarding step complete
      await this.companySettings.setSetting(
        companyId,
        'onboarding_pay_frequency',
        true,
      );

      return paySchedule;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Update a company's pay frequency and generate a new pay schedule
   */
  async updatePayFrequency(
    user: User,
    dto: CreatePayScheduleDto,
    payFrequencyId: string,
  ) {
    const schedule = await this.generatePaySchedule(
      new Date(dto.startDate),
      dto.payFrequency,
      6,
      dto.countryCode,
    );

    try {
      await this.db
        .update(paySchedules)
        .set({
          payFrequency: dto.payFrequency,
          paySchedule: schedule,
          startDate: dto.startDate,
          weekendAdjustment: dto.weekendAdjustment,
          holidayAdjustment: dto.holidayAdjustment,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(paySchedules.companyId, user.companyId),
            eq(paySchedules.id, payFrequencyId),
          ),
        )
        .execute();

      //log audit trail
      await this.auditService.logAction({
        action: 'update',
        entity: 'pay_schedule',
        entityId: payFrequencyId,
        userId: user.id,
        details: 'Pay schedule updated',
        changes: {
          payFrequency: dto.payFrequency,
          paySchedule: schedule,
          startDate: dto.startDate,
          weekendAdjustment: dto.weekendAdjustment,
          holidayAdjustment: dto.holidayAdjustment,
        },
      });

      return 'Pay frequency updated successfully';
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async deletePaySchedule(scheduleId: string, user: User, ip: string) {
    // check if the pay schedule exists
    await this.findOne(scheduleId);

    // check if pay group is using the pay schedule
    const payGroup = await this.db
      .select()
      .from(payGroups)
      .where(
        and(
          eq(payGroups.companyId, user.companyId),
          eq(payGroups.payScheduleId, scheduleId),
        ),
      )
      .execute();

    if (payGroup.length > 0) {
      throw new BadRequestException(
        'Cannot delete pay schedule. Pay group is using this pay schedule',
      );
    }

    await this.db
      .update(paySchedules)
      .set({
        isDeleted: true,
      })
      .where(
        and(
          eq(paySchedules.companyId, user.companyId),
          eq(paySchedules.id, scheduleId),
        ),
      )
      .execute();

    //log audit trail
    await this.auditService.logAction({
      action: 'delete',
      entity: 'pay_schedule',
      entityId: scheduleId,
      userId: user.id,
      details: 'Pay schedule deleted',
      ipAddress: ip,
    });

    return 'Pay frequency deleted successfully';
  }
}
