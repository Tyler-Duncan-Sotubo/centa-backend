import { db } from 'src/drizzle/types/drizzle';
import { AttendanceService } from './attendance.service';
export declare class AttendanceSchedulerService {
    private readonly attendanceService;
    private readonly db;
    private readonly logger;
    constructor(attendanceService: AttendanceService, db: db);
    handleDailyAttendanceSummary(): Promise<void>;
}
