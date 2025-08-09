import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { CacheService } from 'src/common/cache/cache.service';
export declare class AttendanceSettingsService {
    private readonly companySettingsService;
    private readonly cache;
    constructor(companySettingsService: CompanySettingsService, cache: CacheService);
    private allKey;
    private normalizedKey;
    private invalidate;
    getAllAttendanceSettings(companyId: string): Promise<Record<string, any>>;
    getAttendanceSettings(companyId: string): Promise<{
        useShifts: boolean;
        defaultStartTime: any;
        defaultEndTime: any;
        defaultWorkingDays: number;
        lateToleranceMinutes: number;
        earlyClockInWindowMinutes: number;
        blockOnHoliday: boolean;
        allowOvertime: boolean;
        overtimeRate: number;
        allowHalfDay: boolean;
        halfDayDuration: number;
    }>;
    updateAttendanceSetting(companyId: string, key: string, value: any): Promise<void>;
}
