import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CreateAppraisalDto } from './dto/create-appraisal.dto';
import { UpdateAppraisalDto } from './dto/update-appraisal.dto';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { PushNotificationService } from 'src/modules/notification/services/push-notification.service';
export declare class AppraisalsService {
    private readonly db;
    private readonly auditService;
    private readonly companySettingsService;
    private readonly push;
    constructor(db: db, auditService: AuditService, companySettingsService: CompanySettingsService, push: PushNotificationService);
    create(createDto: CreateAppraisalDto, companyId: string, userId?: string): Promise<{
        id: string;
        createdAt: Date | null;
        companyId: string | null;
        managerId: string;
        employeeId: string;
        cycleId: string;
        submittedByEmployee: boolean | null;
        submittedByManager: boolean | null;
        finalized: boolean | null;
        finalScore: number | null;
        promotionRecommendation: "promote" | "hold" | "exit" | null;
        finalNote: string | null;
    }>;
    findAll(companyId: string, cycleId: string): Promise<({
        id: string;
        employeeId: string;
        employeeName: string;
        managerName: string;
        submittedByEmployee: boolean | null;
        submittedByManager: boolean | null;
        finalized: boolean | null;
        finalScore: number | null;
        departmentName: any;
        jobRoleName: string | null;
    } | {
        id: string;
        employeeId: string;
        employeeName: string;
        managerName: string;
        submittedByEmployee: boolean | null;
        submittedByManager: boolean | null;
        finalized: boolean | null;
        finalScore: number | null;
        departmentName: any;
        jobRoleName: string | null;
    })[]>;
    findDashboardForEmployee(companyId: string, employeeId: string): Promise<{
        currentCycle: {
            id: string;
            name: string;
            startDate: string;
            endDate: string;
            status: "active" | "upcoming" | "closed";
        } | null;
        currentCycleAppraisal: {
            id: string;
            submittedByEmployee: boolean | null;
            submittedByManager: boolean | null;
            finalized: boolean | null;
            finalScore: number | null;
        } | null;
        history: {
            id: string;
            cycleId: string;
            cycleName: string | null;
            createdAt: Date | null;
            submittedByEmployee: boolean | null;
            submittedByManager: boolean | null;
            finalized: boolean | null;
            finalScore: number | null;
            employeeName: string;
            managerName: string;
            departmentName: any;
            jobRoleName: string | null;
        }[];
    }>;
    findOne(id: string, companyId: string): Promise<{
        id: string;
        cycleId: string;
        employeeName: string;
        managerName: string;
        submittedByEmployee: boolean | null;
        submittedByManager: boolean | null;
        finalized: boolean | null;
        recommendation: "promote" | "hold" | "exit" | null;
        finalNote: string | null;
        finalScore: number | null;
        departmentName: any;
        jobRoleName: string | null;
    } | {
        id: string;
        cycleId: string;
        employeeName: string;
        managerName: string;
        submittedByEmployee: boolean | null;
        submittedByManager: boolean | null;
        finalized: boolean | null;
        recommendation: "promote" | "hold" | "exit" | null;
        finalNote: string | null;
        finalScore: number | null;
        departmentName: any;
        jobRoleName: string | null;
    }>;
    updateManager(appraisalId: string, newManagerId: string, user: User): Promise<{
        id: string;
        companyId: string | null;
        cycleId: string;
        employeeId: string;
        managerId: string;
        submittedByEmployee: boolean | null;
        submittedByManager: boolean | null;
        finalized: boolean | null;
        finalScore: number | null;
        promotionRecommendation: "promote" | "hold" | "exit" | null;
        finalNote: string | null;
        createdAt: Date | null;
    }>;
    update(id: string, updateDto: UpdateAppraisalDto, user: User): Promise<{
        id: string;
        companyId: string | null;
        cycleId: string;
        employeeId: string;
        managerId: string;
        submittedByEmployee: boolean | null;
        submittedByManager: boolean | null;
        finalized: boolean | null;
        finalScore: number | null;
        promotionRecommendation: "promote" | "hold" | "exit" | null;
        finalNote: string | null;
        createdAt: Date | null;
    }>;
    remove(id: string, user: User): Promise<{
        message: string;
    }>;
    restartAppraisal(appraisalId: string, user: User): Promise<{
        message: string;
    }>;
    sendReminder(employeeId: string): Promise<void>;
}
