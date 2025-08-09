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
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class HolidaysService {
  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    @Inject(DRIZZLE) private db: db,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(HolidaysService.name);
  }

  // ---------- cache keys ----------
  private oneKey(id: string) {
    return `holiday:${id}:detail`;
  }
  private listKey(companyId: string) {
    return `company:${companyId}:holidays:list`;
  }
  private upcomingKey(companyId: string, cc: string, year: number) {
    return `company:${companyId}:holidays:upcoming:${cc}:${year}`;
  }
  private rangeKey(companyId: string, start: string, end: string) {
    return `company:${companyId}:holidays:range:${start}:${end}`;
  }
  private pubApiKey(cc: string, year: number) {
    return `pubhol:${cc}:${year}`; // external API cache
  }
  private async burst(opts: {
    companyId?: string;
    id?: string;
    countryCode?: string;
    year?: number;
    range?: { start: string; end: string };
  }) {
    const jobs: Promise<any>[] = [];
    if (opts.id) jobs.push(this.cache.del(this.oneKey(opts.id)));
    if (opts.companyId) {
      jobs.push(this.cache.del(this.listKey(opts.companyId)));
      // upcoming (if we know country/year)
      if (opts.countryCode && opts.year != null) {
        jobs.push(
          this.cache.del(
            this.upcomingKey(opts.companyId, opts.countryCode, opts.year),
          ),
        );
      }
      if (opts.range) {
        jobs.push(
          this.cache.del(
            this.rangeKey(opts.companyId, opts.range.start, opts.range.end),
          ),
        );
      }
    }
    await Promise.allSettled(jobs);
    this.logger.debug({ ...opts }, 'cache:burst:holidays');
  }

  // ---------- helpers ----------
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

  private async getPublicHolidaysForYear(year: number, countryCode: string) {
    const apiKey = this.configService.get<string>('CALENDARIFIC_API_KEY');
    const url = `https://calendarific.com/api/v2/holidays?country=${countryCode}&year=${year}&api_key=${apiKey}`;

    const cacheKey = this.pubApiKey(countryCode, year);
    this.logger.debug({ year, countryCode, cacheKey }, 'pubholidays:cache:get');

    return this.cache.getOrSetCache(cacheKey, async () => {
      try {
        const resp = await axios.get(url);
        const items = resp.data.response.holidays ?? [];
        const out = items.map((h: any) => ({
          date: new Date(h.date.iso).toISOString().split('T')[0],
          name: h.name,
          type: h.primary_type,
        }));
        this.logger.debug(
          { year, countryCode, count: out.length },
          'pubholidays:api:ok',
        );
        return out;
      } catch (error) {
        this.logger.error(
          { year, countryCode, err: (error as any)?.message },
          'pubholidays:api:error',
        );
        return [] as { date: string; name: string; type: string }[];
      }
    }); // cache 24h
  }

  private async getNonWorkingDaysForYear(year: number, countryCode: string) {
    const publicHolidays = await this.getPublicHolidaysForYear(
      year,
      countryCode,
    );
    const unique = this.removeDuplicateDates(
      publicHolidays.map((d) => ({ ...d })),
    );
    return unique;
  }

  // ---------- commands ----------
  /** Run monthly (or on demand) to insert system holidays (no company scope). */
  async insertHolidaysForCurrentYear(countryCode: string) {
    const currentYear = new Date().getFullYear();
    this.logger.info({ countryCode, currentYear }, 'insertHolidays:start');

    const allHolidays = await this.getNonWorkingDaysForYear(
      currentYear,
      countryCode,
    );

    const existing = await this.db
      .select({ date: holidays.date })
      .from(holidays)
      .where(eq(holidays.year, String(currentYear)))
      .execute();
    const existingDates = new Set(existing.map((h) => h.date));

    const newRows = allHolidays.filter((h) => !existingDates.has(h.date));
    const countryCodeMap: Record<string, string> = {
      NG: 'Nigeria',
      US: 'United States',
      IN: 'India',
      GB: 'United Kingdom',
      CA: 'Canada',
    };

    if (newRows.length > 0) {
      await this.db
        .insert(holidays)
        .values(
          newRows.map((h) => ({
            name: h.name,
            date: h.date,
            type: h.type,
            countryCode,
            country: countryCodeMap[countryCode] || 'Unknown',
            year: String(currentYear),
            source: 'system_default',
          })),
        )
        .execute();
    }

    this.logger.info({ inserted: newRows.length }, 'insertHolidays:done');
    // No company cache to burst here (system rows). Company reads consider system rows via queries below.
    return 'Holidays for the current year have been inserted successfully.';
  }

  // ---------- queries ----------
  async getUpcomingPublicHolidays(countryCode: string, companyId: string) {
    const now = new Date();
    const year = now.getFullYear();
    const key = this.upcomingKey(companyId, countryCode, year);

    this.logger.debug(
      { key, companyId, countryCode, year },
      'upcoming:cache:get',
    );
    return this.cache.getOrSetCache(key, async () => {
      const rows = await this.db
        .select()
        .from(holidays)
        .where(
          and(
            eq(holidays.countryCode, countryCode),
            eq(holidays.year, String(year)),
            or(
              eq(holidays.type, 'Public Holiday'),
              eq(holidays.isWorkingDayOverride, true),
            ),
            or(eq(holidays.companyId, companyId), isNull(holidays.companyId)),
          ),
        )
        .execute();

      const out = rows
        .filter((h) => new Date(h.date) > now)
        .filter((h) => h.name !== 'Weekend')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((h) => ({ name: h.name, date: h.date, type: h.type }));

      this.logger.debug({ companyId, count: out.length }, 'upcoming:db:done');
      return out;
    }); // 1 minute cache is usually enough for “upcoming” lists
  }

  async listHolidaysInRange(
    companyId: string,
    startDate: string,
    endDate: string,
  ) {
    const key = this.rangeKey(companyId, startDate, endDate);
    this.logger.debug(
      { key, companyId, startDate, endDate },
      'range:cache:get',
    );

    return this.cache.getOrSetCache(key, async () => {
      const res = await this.db
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
      this.logger.debug({ companyId, count: res.length }, 'range:db:done');
      return res;
    });
  }

  async bulkCreateHolidays(companyId: string, rows: any[]) {
    this.logger.info(
      { companyId, rows: rows?.length ?? 0 },
      'bulkCreate:start',
    );

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
        this.logger.warn({ errs }, 'bulkCreate:validation-failed');
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
      }));
      return trx.insert(holidays).values(values).returning().execute();
    });

    // Burst company lists
    await this.burst({ companyId });
    this.logger.info(
      { companyId, inserted: inserted.length },
      'bulkCreate:done',
    );
    return inserted;
  }

  async createHoliday(dto: CreateHolidayDto, user: User) {
    this.logger.info({ companyId: user.companyId, dto }, 'create:start');

    const { name, date, year, type } = dto;
    const existing = await this.db
      .select({ id: holidays.id })
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
      this.logger.warn(
        { companyId: user.companyId, name, date },
        'create:duplicate',
      );
      throw new BadRequestException('Holiday already exists');
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

    await this.burst({ companyId: user.companyId });
    this.logger.info({ id: holiday.id }, 'create:done');
    return holiday;
  }

  async findOne(id: string, user: User) {
    const key = this.oneKey(id);
    this.logger.debug(
      { key, id, companyId: user.companyId },
      'findOne:cache:get',
    );

    const row = await this.cache.getOrSetCache(key, async () => {
      const [res] = await this.db
        .select()
        .from(holidays)
        .where(and(eq(holidays.id, id), eq(holidays.companyId, user.companyId)))
        .execute();
      return res ?? null;
    });

    if (!row) {
      this.logger.warn({ id, companyId: user.companyId }, 'findOne:not-found');
      throw new NotFoundException('Holiday not found');
    }
    return row;
  }

  async findAll(companyId: string) {
    const key = this.listKey(companyId);
    this.logger.debug({ key, companyId }, 'findAll:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const rows = await this.db
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
      this.logger.debug({ companyId, count: rows.length }, 'findAll:db:done');
      return rows;
    });
  }

  async update(id: string, dto: UpdateHolidayDto, user: User) {
    this.logger.info({ id, companyId: user.companyId, dto }, 'update:start');

    // ensure exists (and cache populate)
    await this.findOne(id, user);

    const [updated] = await this.db
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

    await this.burst({ companyId: user.companyId, id });
    this.logger.info({ id }, 'update:done');
    return updated;
  }

  async delete(id: string, user: User) {
    this.logger.info({ id, companyId: user.companyId }, 'delete:start');

    // ensure exists (and cache populate)
    await this.findOne(id, user);

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

    await this.burst({ companyId: user.companyId, id });
    this.logger.info({ id }, 'delete:done');
    return { message: 'Holiday deleted successfully' };
  }
}
