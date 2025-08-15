import { CreatePayScheduleDto } from './dto/create-pay-schedule.dto';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { CacheService } from 'src/common/cache/cache.service';
export declare class PaySchedulesService {
    private readonly db;
    private readonly auditService;
    private readonly companySettings;
    private readonly cache;
    constructor(db: db, auditService: AuditService, companySettings: CompanySettingsService, cache: CacheService);
    findOne(scheduleId: string): Promise<{
        id: string;
        companyId: string;
        startDate: string;
        payFrequency: string;
        paySchedule: unknown;
        weekendAdjustment: string;
        holidayAdjustment: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        isDeleted: boolean | null;
    }>;
    getCompanyPaySchedule(companyId: string): Promise<{
        id: string;
        companyId: string;
        startDate: string;
        payFrequency: string;
        paySchedule: unknown;
        weekendAdjustment: string;
        holidayAdjustment: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        isDeleted: boolean | null;
    }[]>;
    getNextPayDate(companyId: string): Promise<Date | null>;
    listPaySchedulesForCompany(companyId: string): Promise<{
        payFrequency: string;
        paySchedules: unknown;
        id: string;
    }[]>;
    private isPublicHoliday;
    private adjustForWeekendAndHoliday;
    private generatePaySchedule;
    createPayFrequency(companyId: string, dto: CreatePayScheduleDto): Promise<{
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string;
        startDate: string;
        payFrequency: string;
        paySchedule: unknown;
        weekendAdjustment: string;
        holidayAdjustment: string;
        isDeleted: boolean | null;
    }[]>;
    updatePayFrequency(user: User, dto: CreatePayScheduleDto, payFrequencyId: string): Promise<string>;
    deletePaySchedule(scheduleId: string, user: User, ip: string): Promise<string>;
}
