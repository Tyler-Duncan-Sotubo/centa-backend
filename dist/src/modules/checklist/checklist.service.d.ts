import { db } from 'src/drizzle/types/drizzle';
import { ExtraKeyParamDto } from './dto/extra-key.param';
import { AttendanceChecklistService } from './services/attendance-checklist.service';
import { HiringChecklistService } from './services/hiring-checklist.service';
import { LeaveChecklistService } from './services/leave-checklist.service';
import { PayrollChecklistService } from './services/payroll-checklist.service';
import { PerformanceChecklistService } from './services/performance-checklist.service';
import { StaffChecklistService } from './services/staff-checklist.service';
export declare class ChecklistService {
    private db;
    private readonly svc;
    private readonly payroll;
    private readonly performance;
    private readonly hiring;
    private readonly attendance;
    private readonly leave;
    constructor(db: db, svc: StaffChecklistService, payroll: PayrollChecklistService, performance: PerformanceChecklistService, hiring: HiringChecklistService, attendance: AttendanceChecklistService, leave: LeaveChecklistService);
    markExtraDone(companyId: string, key: ExtraKeyParamDto['key'], userId: string): Promise<void>;
    getOverallChecklistStatus(companyId: string): Promise<{
        staff: boolean;
        payroll: any;
        performance: boolean;
        hiring: boolean;
        attendance: boolean;
        leave: boolean;
    }>;
}
