import { AttendanceSettingsService } from './attendance-settings.service';
import { BaseController } from 'src/common/interceptor/base.controller';
import { User } from 'src/common/types/user.type';
export declare class AttendanceSettingsController extends BaseController {
    private readonly attendanceSettingsService;
    constructor(attendanceSettingsService: AttendanceSettingsService);
    getAllAttendanceSettings(user: User): Promise<{
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
    updateAttendanceSettings(user: User, key: string, value: any): Promise<any>;
}
