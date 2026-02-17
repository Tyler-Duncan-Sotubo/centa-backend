import { db } from 'src/drizzle/types/drizzle';
import { EmployeesService } from 'src/modules/core/employees/employees.service';
import { CacheService } from 'src/common/cache/cache.service';
import { User } from 'src/common/types/user.type';
import { AttendanceLocationService } from './attendance-location.service';
export declare class BreaksService {
    private readonly db;
    private readonly employeesService;
    private readonly cache;
    private readonly location;
    constructor(db: db, employeesService: EmployeesService, cache: CacheService, location: AttendanceLocationService);
    private tags;
    private getTodayWindow;
    private getTodayAttendance;
    startBreak(user: User, latitude: string, longitude: string, tz?: string): Promise<string>;
    endBreak(user: User, latitude: string, longitude: string, tz?: string): Promise<string>;
    getBreakStatus(user: User, tz?: string): Promise<{
        onBreak: boolean;
        breakStart: null;
    } | {
        onBreak: boolean;
        breakStart: Date;
    }>;
    getTotalBreakMinutes(companyId: string, attendanceRecordId: string): Promise<number>;
}
