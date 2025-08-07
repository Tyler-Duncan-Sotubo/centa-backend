import { CreateOffboardingBeginDto } from './dto/create-offboarding.dto';
import { UpdateOffboardingDto } from './dto/update-offboarding.dto';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { AddOffboardingDetailsDto } from './dto/add-offboarding-details.dto';
export declare class OffboardingService {
    private readonly db;
    private readonly auditService;
    constructor(db: db, auditService: AuditService);
    begin(createDto: CreateOffboardingBeginDto, user: User): Promise<{
        id: string;
        companyId: string;
        employeeId: string;
        terminationType: string | null;
        terminationReason: string | null;
        terminationDate: string;
        eligibleForRehire: boolean | null;
        notes: string | null;
        status: string | null;
        startedAt: Date | null;
        completedAt: Date | null;
    }>;
    addDetails(sessionId: string, dto: AddOffboardingDetailsDto, user: User): Promise<{
        sessionId: string;
        checklistCount: number;
    }>;
    findByEmployeeId(employeeId: string, companyId: string): Promise<{
        id: string;
        employeeId: string;
        companyId: string;
        terminationType: string;
        terminationReason: string;
        terminationDate: string;
        eligibleForRehire: boolean | null;
        status: string | null;
        startedAt: Date | null;
        completedAt: Date | null;
        notes: string | null;
        employeeName: unknown;
    } | {
        id: string;
        employeeId: string;
        companyId: string;
        terminationType: string;
        terminationReason: string;
        terminationDate: string;
        eligibleForRehire: boolean | null;
        status: string | null;
        startedAt: Date | null;
        completedAt: Date | null;
        notes: string | null;
        employeeName: unknown;
    }>;
    findAll(companyId: string): Promise<{
        id: string;
        employeeName: string;
        jobRole: string | null;
        department: any;
        terminationType: string | null;
        terminationReason: string | null;
        status: string | null;
        checklist: {
            name: string;
            completed: boolean;
            id: string;
        }[];
        progress: {
            completed: number;
            total: number;
            percent: number;
        };
    }[]>;
    findOne(id: string, companyId: string): Promise<{
        checklist: {
            id: string;
            name: string;
            createdAt: Date | null;
            description: string | null;
            completedAt: Date | null;
            order: number | null;
            isAssetReturnStep: boolean | null;
            sessionId: string;
            assetId: string | null;
            completed: boolean | null;
        }[];
        id: string;
        companyId: string;
        employeeId: string;
        terminationType: string | null;
        terminationReason: string | null;
        terminationDate: string;
        eligibleForRehire: boolean | null;
        notes: string | null;
        status: string | null;
        startedAt: Date | null;
        completedAt: Date | null;
    }>;
    update(id: string, dto: UpdateOffboardingDto, user: User): Promise<{
        id: string;
        employeeId: string;
        companyId: string;
        terminationType: string | null;
        terminationReason: string | null;
        terminationDate: string;
        eligibleForRehire: boolean | null;
        notes: string | null;
        status: string | null;
        startedAt: Date | null;
        completedAt: Date | null;
    }>;
    remove(id: string, user: User): Promise<{
        message: string;
    }>;
    updateChecklist(checklistItemId: string, user: User): Promise<{
        message: string;
        sessionCompleted: boolean;
    }>;
    cancel(sessionId: string, user: User): Promise<{
        deleted: boolean;
        sessionId: string;
    }>;
}
