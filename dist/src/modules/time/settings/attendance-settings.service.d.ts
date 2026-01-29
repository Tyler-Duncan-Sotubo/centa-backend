import { CompanySettingsService } from 'src/company-settings/company-settings.service';
export declare class AttendanceSettingsService {
    private readonly companySettingsService;
    constructor(companySettingsService: CompanySettingsService);
    private tags;
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
