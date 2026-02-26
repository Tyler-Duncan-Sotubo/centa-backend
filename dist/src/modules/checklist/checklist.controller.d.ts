import { StaffChecklistService } from './services/staff-checklist.service';
import { User } from 'src/common/types/user.type';
import { ExtraKeyParamDto } from './dto/extra-key.param';
import { ChecklistService } from './checklist.service';
import { PayrollChecklistService } from './services/payroll-checklist.service';
import { BaseController } from 'src/common/interceptor/base.controller';
import { PerformanceChecklistService } from './services/performance-checklist.service';
import { HiringChecklistService } from './services/hiring-checklist.service';
import { AttendanceChecklistService } from './services/attendance-checklist.service';
import { LeaveChecklistService } from './services/leave-checklist.service';
export declare class ChecklistController extends BaseController {
    private readonly svc;
    private readonly checklist;
    private readonly payroll;
    private readonly performance;
    private readonly hiring;
    private readonly attendance;
    private readonly leave;
    constructor(svc: StaffChecklistService, checklist: ChecklistService, payroll: PayrollChecklistService, performance: PerformanceChecklistService, hiring: HiringChecklistService, attendance: AttendanceChecklistService, leave: LeaveChecklistService);
    progress(user: User): Promise<{
        tasks: Record<string, import("./constants/constants").TaskStatus>;
        required: any[];
        completed: boolean;
        disabledWhenComplete: any;
    }>;
    payrollChecklist(user: User): Promise<{
        tasks: Record<string, import("./constants/constants").TaskStatus>;
        required: any;
        completed: any;
        disabledWhenComplete: any;
    }>;
    performanceChecklist(user: User): Promise<{
        tasks: Record<string, import("./constants/constants").TaskStatus>;
        required: ("performance_general" | "goal_policies" | "feedback_settings" | "competency" | "performance_templates" | "appraisal_framework" | "start_1_1_checkin")[];
        completed: boolean;
        disabledWhenComplete: boolean;
    }>;
    hiringChecklist(user: User): Promise<{
        tasks: Record<string, import("./constants/constants").TaskStatus>;
        required: ("pipeline" | "scorecards" | "email_templates" | "offer_templates" | "create_jobs" | "google_integration")[];
        completed: boolean;
        disabledWhenComplete: boolean;
    }>;
    attendanceChecklist(user: User): Promise<{
        tasks: Record<string, import("./constants/constants").TaskStatus>;
        required: ("attendance_setting" | "shift_management" | "assign_rota" | "add_office_location")[];
        completed: boolean;
        disabledWhenComplete: boolean;
    }>;
    leaveChecklist(user: User): Promise<{
        tasks: Record<string, import("./constants/constants").TaskStatus>;
        required: ("holidays" | "blocked_days" | "leave_settings" | "leave_types_policies" | "reserved_days")[];
        completed: boolean;
        disabledWhenComplete: boolean;
    }>;
    done(user: User, key: ExtraKeyParamDto['key']): Promise<{
        status: string;
    }>;
}
