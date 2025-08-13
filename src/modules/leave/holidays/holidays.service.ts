import { BadRequestException, Inject, Injectable } from '@nestjs/common';
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

@Injectable()
export class HolidaysService {
  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    @Inject(DRIZZLE) private db: db,
  ) {}

  // Method to check if the date is a public holiday
  private async getPublicHolidaysForYear(year: number, countryCode: string) {
    const publicHolidays: {
      date: string;
      name: string;
      type: string;
    }[] = [];

    const apiKey = this.configService.get<string>('CALENDARIFIC_API_KEY');
    const url = `https://calendarific.com/api/v2/holidays?country=${countryCode}&year=${year}&api_key=${apiKey}`;

    try {
      const response = await axios.get(url);
      const holidays = response.data.response.holidays;

      // Format holidays to match the schema
      holidays.forEach((holiday: any) => {
        const holidayDate = new Date(holiday.date.iso);
        publicHolidays.push({
          date: holidayDate.toISOString().split('T')[0],
          name: holiday.name,
          type: holiday.primary_type,
        });
      });
    } catch (error) {
      console.error('Error fetching public holidays:', error);
    }

    return publicHolidays;
  }

  // Helper function to remove duplicate dates from the array
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
    const nonWorkingDays: {
      date: string;
      name: string;
      type: string;
    }[] = [];

    // Step 2: Get all public holidays
    const publicHolidays = await this.getPublicHolidaysForYear(
      year,
      countryCode,
    );

    // Add public holidays to nonWorkingDays array
    publicHolidays.forEach((holiday) => {
      nonWorkingDays.push({
        date: holiday.date,
        name: holiday.name,
        type: holiday.type, // Using the type directly from the API response
      });
    });

    // Remove duplicates (if a public holiday happens to fall on a weekend)
    const uniqueNonWorkingDays = this.removeDuplicateDates(
      nonWorkingDays.map((day) => ({ ...day, date: day.date })),
    );

    return uniqueNonWorkingDays;
  }

  // Call This Method every 1st Day of the Month
  async insertHolidaysForCurrentYear(countryCode: string) {
    const currentYear = new Date().getFullYear();
    const allHolidays = await this.getNonWorkingDaysForYear(
      currentYear,
      countryCode,
    );

    const existingHolidays = await this.db
      .select({ date: holidays.date })
      .from(holidays);

    const existingDates = new Set(existingHolidays.map((h) => h.date));

    const newHolidays = allHolidays.filter(
      (holiday) => !existingDates.has(holiday.date),
    );

    const countryCodeMap: Record<string, string> = {
      NG: 'Nigeria',
      US: 'United States',
      IN: 'India',
      GB: 'United Kingdom',
      CA: 'Canada',
    };

    if (newHolidays.length > 0) {
      await this.db.insert(holidays).values(
        newHolidays.map((holiday) => ({
          name: holiday.name,
          date: holiday.date,
          type: holiday.type,
          countryCode: countryCode,
          country: countryCodeMap[countryCode] || 'Unknown',
          year: currentYear.toString(),
          source: 'system_default',
        })),
      );
    }

    return 'Holidays for the current year have been inserted successfully.';
  }

  // upcoming public holidays
  async getUpcomingPublicHolidays(countryCode: string, companyId: string) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();

    const upcomingHolidays = await this.db
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

    const filteredHolidays = upcomingHolidays.filter((holiday) => {
      const holidayDate = new Date(holiday.date);
      return holidayDate > currentDate; // Filter out past holidays
    });

    // get holidays where name is not "Weekend"
    const nonWeekendHolidays = filteredHolidays.filter(
      (holiday) => holiday.name !== 'Weekend',
    );

    // Sort holidays by date
    nonWeekendHolidays.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    return nonWeekendHolidays.map((holiday) => ({
      name: holiday.name,
      date: holiday.date,
      type: holiday.type,
    }));
  }

  async listHolidaysInRange(
    companyId: string,
    startDate: string,
    endDate: string,
  ) {
    return this.db
      .select()
      .from(holidays)
      .where(
        and(
          or(
            eq(holidays.companyId, companyId),
            isNull(holidays.companyId), // include system/global holidays
          ),
          gte(holidays.date, startDate),
          lte(holidays.date, endDate),
          eq(holidays.type, 'Public Holiday'),
          eq(holidays.isWorkingDayOverride, false),
        ),
      )
      .execute();
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
      }));

      return trx.insert(holidays).values(values).returning().execute();
    });

    return inserted;
  }

  async createHoliday(dto: CreateHolidayDto, user: User) {
    const { name, date, year, type } = dto;

    const existingHoliday = await this.db
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

    if (existingHoliday.length > 0) {
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

    // Log the creation of the holiday
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

    return holiday;
  }

  async findOne(id: string, user: User) {
    const holiday = await this.db
      .select()
      .from(holidays)
      .where(and(eq(holidays.id, id), eq(holidays.companyId, user.companyId)))
      .execute();

    if (holiday.length === 0) {
      throw new Error('Holiday not found');
    }
  }

  async findAll(companyId: string) {
    const holidaysList = await this.db
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

    return holidaysList;
  }

  async update(id: string, dto: UpdateHolidayDto, user: User) {
    await this.findOne(id, user);

    const updatedHoliday = await this.db
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

    // Log the update of the holiday
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
    return updatedHoliday;
  }

  // Method to delete a holiday
  async delete(id: string, user: User) {
    await this.findOne(id, user);
    await this.db.delete(holidays).where(eq(holidays.id, id)).execute();

    // Log the deletion of the holiday
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

    return { message: 'Holiday deleted successfully' };
  }
}
