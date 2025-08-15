import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { holidays } from '../schema/holidays.schema';
import { ConfigService } from '@nestjs/config';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import axios from 'axios';
import { and, eq, gte, isNull, lte, or, asc } from 'drizzle-orm';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class HolidaysService {
  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    @Inject(DRIZZLE) private db: db,
    private readonly cache: CacheService,
  ) {}

  /** Common tags for this domain */
  private tags(companyId: string) {
    return [
      `company:${companyId}:holidays`,
      `company:${companyId}:holidays:list`,
      `company:${companyId}:holidays:range`,
      `company:${companyId}:holidays:upcoming`,
    ];
  }

  // ───────────────────────────────────────────────────────────────────────────
  // External API helpers (cached per country/year)
  // ───────────────────────────────────────────────────────────────────────────

  /** Calendarific fetch (cached per {country, year}) */
  private async fetchCalendarificHolidays(
    year: number,
    countryCode: string,
  ): Promise<Array<{ date: string; name: string; type: string }>> {
    const apiKey = this.configService.get<string>('CALENDARIFIC_API_KEY');
    if (!apiKey) return [];

    // cache key NOT versioned by company (global data)
    const key = [
      'public-holidays',
      'calendarific',
      countryCode,
      String(year),
    ].join(':');

    return this.cache.getOrSetCache(key, async () => {
      const url = `https://calendarific.com/api/v2/holidays?country=${countryCode}&year=${year}&api_key=${apiKey}`;
      try {
        const response = await axios.get(url);
        const items = response.data?.response?.holidays ?? [];
        return items.map((h: any) => ({
          date: new Date(h.date.iso).toISOString().split('T')[0],
          name: h.name,
          type: h.primary_type,
        }));
      } catch (error) {
        console.error('Error fetching public holidays:', error);
        return [];
      }
    });
  }

  private removeDuplicateDates(
    dates: { date: string; name: string; type: string }[],
  ): { type: string; name: string; date: string }[] {
    const seen = new Set<string>();
    const result: { type: string; name: string; date: string }[] = [];
    for (const item of dates) {
      if (!seen.has(item.date)) {
        seen.add(item.date);
        result.push(item);
      }
    }
    return result;
  }

  private async getNonWorkingDaysForYear(year: number, countryCode: string) {
    // currently just “public holidays”; kept separate for future weekend logic
    const nonWorkingDays: { date: string; name: string; type: string }[] = [];

    const publicHolidays = await this.fetchCalendarificHolidays(
      year,
      countryCode,
    );

    publicHolidays.forEach((holiday) => {
      nonWorkingDays.push({
        date: holiday.date,
        name: holiday.name,
        type: holiday.type,
      });
    });

    return this.removeDuplicateDates(nonWorkingDays);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Commands (writes) → bump version to invalidate company caches
  // ───────────────────────────────────────────────────────────────────────────

  /** Call this monthly (e.g. cron on day 1) */
  async insertHolidaysForCurrentYear(countryCode: string, companyId?: string) {
    const currentYear = new Date().getFullYear();
    const allHolidays = await this.getNonWorkingDaysForYear(
      currentYear,
      countryCode,
    );

    const existing = await this.db
      .select({ date: holidays.date })
      .from(holidays);
    const existingDates = new Set(existing.map((h) => h.date));

    const newHolidays = allHolidays.filter((h) => !existingDates.has(h.date));

    const countryCodeMap: Record<string, string> = {
      NG: 'Nigeria',
      US: 'United States',
      IN: 'India',
      GB: 'United Kingdom',
      CA: 'Canada',
    };

    if (newHolidays.length > 0) {
      await this.db
        .insert(holidays)
        .values(
          newHolidays.map((h) => ({
            name: h.name,
            date: h.date,
            type: h.type,
            countryCode,
            country: countryCodeMap[countryCode] || 'Unknown',
            year: String(currentYear),
            source: 'system_default',
            companyId: null, // system/global
            isWorkingDayOverride: false,
          })),
        )
        .execute();
    }

    // bump version for all companies only if you inserted company-specific rows;
    // for system rows we skip (reads include system rows but versioned by company)
    if (companyId) {
      await this.cache.bumpCompanyVersion(companyId);
    }

    return 'Holidays for the current year have been inserted successfully.';
  }

  async bulkCreateHolidays(companyId: string, rows: any[]) {
    const dtos: CreateHolidayDto[] = [];

    for (const row of rows) {
      const dto = plainToInstance(CreateHolidayDto, {
        name: row['Name'] || row['name'],
        date: row['Date'] || row['date'],
        year: row['Year'] || row['year'],
        type: row['Type'] || row['type'],
        country: row['Country'] || row['country'],
        countryCode: row['CountryCode'] || row['countryCode'],
      });

      const errs = await validate(dto);
      if (errs.length) {
        throw new BadRequestException('Invalid data: ' + JSON.stringify(errs));
      }

      dtos.push(dto);
    }

    const inserted = await this.db.transaction(async (trx) => {
      const values = dtos.map((d) => ({
        companyId,
        name: d.name,
        date: d.date,
        year: d.year,
        type: d.type,
        country: d.country,
        countryCode: d.countryCode,
        isWorkingDayOverride: true,
        source: 'manual',
      }));

      return trx.insert(holidays).values(values).returning().execute();
    });

    await this.cache.bumpCompanyVersion(companyId);
    return inserted;
  }

  async createHoliday(dto: CreateHolidayDto, user: User) {
    const { name, date, year, type } = dto;

    const existing = await this.db
      .select()
      .from(holidays)
      .where(
        and(
          eq(holidays.name, name),
          eq(holidays.date, date),
          eq(holidays.year, year),
          eq(holidays.type, type),
          eq(holidays.companyId, user.companyId),
        ),
      )
      .execute();

    if (existing.length > 0) {
      throw new Error('Holiday already exists');
    }

    const [holiday] = await this.db
      .insert(holidays)
      .values({
        ...dto,
        companyId: user.companyId,
        isWorkingDayOverride: true,
        source: 'manual',
      })
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'create',
      entity: 'holiday',
      entityId: holiday.id,
      userId: user.id,
      details: 'Created new holiday',
      changes: {
        name: holiday.name,
        date: holiday.date,
        year: holiday.year,
        type: holiday.type,
        companyId: holiday.companyId,
        isWorkingDayOverride: holiday.isWorkingDayOverride,
        source: holiday.source,
      },
    });

    await this.cache.bumpCompanyVersion(user.companyId);
    return holiday;
  }

  async update(id: string, dto: UpdateHolidayDto, user: User) {
    // ensure exists (cached read would also be fine, but we’re writing anyway)
    const found = await this.db
      .select()
      .from(holidays)
      .where(and(eq(holidays.id, id), eq(holidays.companyId, user.companyId)))
      .execute();
    if (found.length === 0) throw new NotFoundException('Holiday not found');

    const updated = await this.db
      .update(holidays)
      .set({
        ...dto,
        companyId: user.companyId,
        isWorkingDayOverride: true,
        source: 'manual',
      })
      .where(eq(holidays.id, id))
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'update',
      entity: 'holiday',
      details: 'Updated holiday',
      entityId: id,
      userId: user.id,
      changes: {
        ...dto,
        companyId: user.companyId,
        isWorkingDayOverride: true,
        source: 'manual',
      },
    });

    await this.cache.bumpCompanyVersion(user.companyId);
    return updated;
  }

  async delete(id: string, user: User) {
    // ensure exists
    const found = await this.db
      .select()
      .from(holidays)
      .where(and(eq(holidays.id, id), eq(holidays.companyId, user.companyId)))
      .execute();
    if (found.length === 0) throw new NotFoundException('Holiday not found');

    await this.db.delete(holidays).where(eq(holidays.id, id)).execute();

    await this.auditService.logAction({
      action: 'delete',
      entity: 'holiday',
      details: 'Deleted holiday',
      entityId: id,
      userId: user.id,
      changes: {
        id,
        companyId: user.companyId,
        isWorkingDayOverride: true,
        source: 'manual',
      },
    });

    await this.cache.bumpCompanyVersion(user.companyId);
    return { message: 'Holiday deleted successfully' };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Queries (reads) → versioned cache per company
  // ───────────────────────────────────────────────────────────────────────────

  async findOne(id: string, user: User) {
    return this.cache.getOrSetVersioned(
      user.companyId,
      ['holidays', 'one', id],
      async () => {
        const rows = await this.db
          .select()
          .from(holidays)
          .where(
            and(eq(holidays.id, id), eq(holidays.companyId, user.companyId)),
          )
          .execute();

        if (rows.length === 0) throw new NotFoundException('Holiday not found');
        return rows[0];
      },
      { tags: this.tags(user.companyId) },
    );
  }

  async findAll(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['holidays', 'list'],
      async () => {
        return this.db
          .select()
          .from(holidays)
          .where(
            and(
              eq(holidays.companyId, companyId),
              eq(holidays.isWorkingDayOverride, true),
            ),
          )
          .orderBy(asc(holidays.date))
          .execute();
      },
      { tags: this.tags(companyId) },
    );
  }

  async getUpcomingPublicHolidays(countryCode: string, companyId: string) {
    const now = new Date();

    return this.cache.getOrSetVersioned(
      companyId,
      ['holidays', 'upcoming', countryCode, String(now.getFullYear())],
      async () => {
        const currentYear = now.getFullYear();

        const upcoming = await this.db
          .select()
          .from(holidays)
          .where(
            and(
              eq(holidays.countryCode, countryCode),
              eq(holidays.year, currentYear.toString()),
              or(
                eq(holidays.type, 'Public Holiday'),
                eq(holidays.isWorkingDayOverride, true),
              ),
              or(eq(holidays.companyId, companyId), isNull(holidays.companyId)),
            ),
          )
          .execute();

        const filtered = upcoming
          .filter((h) => new Date(h.date) > now)
          .filter((h) => h.name !== 'Weekend')
          .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          );

        return filtered.map((h) => ({
          name: h.name,
          date: h.date,
          type: h.type,
        }));
      },
      { tags: this.tags(companyId) },
    );
  }

  async listHolidaysInRange(
    companyId: string,
    startDate: string,
    endDate: string,
  ) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['holidays', 'range', startDate, endDate],
      async () => {
        return this.db
          .select()
          .from(holidays)
          .where(
            and(
              or(eq(holidays.companyId, companyId), isNull(holidays.companyId)),
              gte(holidays.date, startDate),
              lte(holidays.date, endDate),
              eq(holidays.type, 'Public Holiday'),
              eq(holidays.isWorkingDayOverride, false),
            ),
          )
          .execute();
      },
      { tags: this.tags(companyId) },
    );
  }
}
