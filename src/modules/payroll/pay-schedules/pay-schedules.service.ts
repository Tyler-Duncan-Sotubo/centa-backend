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
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class PaySchedulesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly companySettings: CompanySettingsService,
    private readonly cache: CacheService,
  ) {}

  // ---------------------------------------------------------------------------
  // Reads (cached, versioned)
  // ---------------------------------------------------------------------------

  async findOne(scheduleId: string) {
    // First, get the companyId for versioning
    const [owner] = await this.db
      .select({ companyId: paySchedules.companyId })
      .from(paySchedules)
      .where(eq(paySchedules.id, scheduleId))
      .limit(1)
      .execute();

    if (!owner?.companyId) {
      throw new BadRequestException('Pay schedule not found');
    }

    return this.cache.getOrSetVersioned(
      owner.companyId,
      ['paySchedule', 'byId', scheduleId],
      async () => {
        const rows = await this.db
          .select()
          .from(paySchedules)
          .where(eq(paySchedules.id, scheduleId))
          .execute();

        if (!rows.length) {
          throw new BadRequestException('Pay schedule not found');
        }
        return rows[0];
      },
      {
        tags: [
          'paySchedules',
          `company:${owner.companyId}:paySchedules`,
          `paySchedule:${scheduleId}`,
        ],
      },
    );
  }

  async getCompanyPaySchedule(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['paySchedules', 'full'],
      async () => {
        return await this.db
          .select()
          .from(paySchedules)
          .where(eq(paySchedules.companyId, companyId))
          .execute();
      },
      { tags: ['paySchedules', `company:${companyId}:paySchedules`] },
    );
  }

  async getNextPayDate(companyId: string) {
    // Derive from schedules; cache the derived value too
    return this.cache.getOrSetVersioned(
      companyId,
      ['paySchedules', 'nextPayDate'],
      async () => {
        const paySchedulesData = await this.db
          .select({ paySchedule: paySchedules.paySchedule })
          .from(paySchedules)
          .where(eq(paySchedules.companyId, companyId))
          .execute();

        if (paySchedulesData.length === 0) {
          throw new BadRequestException(
            'No pay schedules found for this company',
          );
        }

        const today = new Date();
        const allPayDates = paySchedulesData
          .flatMap((s) => s.paySchedule)
          .map((d) => new Date(d as string | number | Date))
          .filter((d) => d > today)
          .sort((a, b) => a.getTime() - b.getTime());

        return allPayDates.length > 0 ? allPayDates[0] : null;
      },
      { tags: ['paySchedules', `company:${companyId}:paySchedules`] },
    );
  }

  async listPaySchedulesForCompany(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['paySchedules', 'list'],
      async () => {
        const rows = await this.db
          .select({
            payFrequency: paySchedules.payFrequency,
            paySchedules: paySchedules.paySchedule,
            id: paySchedules.id,
          })
          .from(paySchedules)
          .where(eq(paySchedules.companyId, companyId))
          .execute();

        if (!rows.length) {
          throw new BadRequestException(
            'No pay schedules found for this company',
          );
        }
        return rows;
      },
      { tags: ['paySchedules', `company:${companyId}:paySchedules`] },
    );
  }

  // ---------------------------------------------------------------------------
  // Helpers (holidays & schedule generation)
  // ---------------------------------------------------------------------------

  private async isPublicHoliday(
    date: Date,
    countryCode: string,
  ): Promise<boolean> {
    const formattedDate = date.toISOString().split('T')[0];
    const url = `https://date.nager.at/api/v3/publicholidays/${date.getFullYear()}/${countryCode}`;
    try {
      const { data } = await axios.get(url);
      return (
        Array.isArray(data) && data.some((h: any) => h?.date === formattedDate)
      );
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  private async adjustForWeekendAndHoliday(
    date: Date,
    countryCode: string,
  ): Promise<Date> {
    let adjusted = new Date(date);

    // Weekend -> go backwards
    while (isSaturday(adjusted) || isSunday(adjusted)) {
      adjusted = addDays(adjusted, -1);
    }

    // Holiday -> go backwards
    while (await this.isPublicHoliday(adjusted, countryCode)) {
      adjusted = addDays(adjusted, -1);
    }

    return adjusted;
  }

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

        case 'semi-monthly': {
          const firstHalf = startOfMonth(addMonths(startDate, i));
          const secondHalf = addDays(firstHalf, 14);
          schedule.push(
            await this.adjustForWeekendAndHoliday(firstHalf, countryCode),
            await this.adjustForWeekendAndHoliday(secondHalf, countryCode),
          );
          continue;
        }

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

  // ---------------------------------------------------------------------------
  // Writes (bump version + invalidate tags)
  // ---------------------------------------------------------------------------

  async createPayFrequency(companyId: string, dto: CreatePayScheduleDto) {
    const schedule = await this.generatePaySchedule(
      new Date(dto.startDate),
      dto.payFrequency,
      6,
      dto.countryCode,
    );

    try {
      const inserted = await this.db
        .insert(paySchedules)
        .values({
          companyId,
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

      await this.companySettings.setOnboardingTask(
        companyId,
        'payroll',
        'pay_schedule',
        'done',
      );

      // Invalidate company pay-schedule caches
      await this.cache.bumpCompanyVersion(companyId);
      await this.cache.invalidateTags([
        'paySchedules',
        `company:${companyId}:paySchedules`,
      ]);

      return inserted;
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

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

      // Invalidate caches
      await this.cache.bumpCompanyVersion(user.companyId);
      await this.cache.invalidateTags([
        'paySchedules',
        `company:${user.companyId}:paySchedules`,
        `paySchedule:${payFrequencyId}`,
      ]);

      return 'Pay frequency updated successfully';
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  async deletePaySchedule(scheduleId: string, user: User, ip: string) {
    // ensure exists (cached path will throw if not)
    await this.findOne(scheduleId);

    // ensure no pay group uses it
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
      .set({ isDeleted: true })
      .where(
        and(
          eq(paySchedules.companyId, user.companyId),
          eq(paySchedules.id, scheduleId),
        ),
      )
      .execute();

    await this.auditService.logAction({
      action: 'delete',
      entity: 'pay_schedule',
      entityId: scheduleId,
      userId: user.id,
      details: 'Pay schedule deleted',
      ipAddress: ip,
    });

    // Invalidate caches
    await this.cache.bumpCompanyVersion(user.companyId);
    await this.cache.invalidateTags([
      'paySchedules',
      `company:${user.companyId}:paySchedules`,
      `paySchedule:${scheduleId}`,
    ]);

    return 'Pay frequency deleted successfully';
  }
}
