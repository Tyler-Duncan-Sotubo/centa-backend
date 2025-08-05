import { ConfigService } from '@nestjs/config';
import { db } from 'src/drizzle/types/drizzle';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
export declare class HolidaysService {
    private readonly configService;
    private readonly auditService;
    private db;
    constructor(configService: ConfigService, auditService: AuditService, db: db);
    private getPublicHolidaysForYear;
    private removeDuplicateDates;
    private getNonWorkingDaysForYear;
    insertHolidaysForCurrentYear(countryCode: string): Promise<string>;
    getUpcomingPublicHolidays(countryCode: string, companyId: string): Promise<{
        name: string;
        date: string;
        type: string;
    }[]>;
    listHolidaysInRange(companyId: string, startDate: string, endDate: string): Promise<{
        id: string;
        companyId: string | null;
        name: string;
        date: string;
        year: string;
        type: string;
        country: string | null;
        countryCode: string | null;
        isWorkingDayOverride: boolean | null;
        source: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }[]>;
    bulkCreateHolidays(companyId: string, rows: any[]): Promise<{
        date: string;
        id: string;
        name: string;
        country: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string | null;
        type: string;
        source: string | null;
        year: string;
        countryCode: string | null;
        isWorkingDayOverride: boolean | null;
    }[]>;
    createHoliday(dto: CreateHolidayDto, user: User): Promise<{
        date: string;
        id: string;
        name: string;
        country: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string | null;
        type: string;
        source: string | null;
        year: string;
        countryCode: string | null;
        isWorkingDayOverride: boolean | null;
    }>;
    findOne(id: string, user: User): Promise<void>;
    findAll(companyId: string): Promise<{
        id: string;
        companyId: string | null;
        name: string;
        date: string;
        year: string;
        type: string;
        country: string | null;
        countryCode: string | null;
        isWorkingDayOverride: boolean | null;
        source: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }[]>;
    update(id: string, dto: UpdateHolidayDto, user: User): Promise<{
        id: string;
        companyId: string | null;
        name: string;
        date: string;
        year: string;
        type: string;
        country: string | null;
        countryCode: string | null;
        isWorkingDayOverride: boolean | null;
        source: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }[]>;
    delete(id: string, user: User): Promise<{
        message: string;
    }>;
}
