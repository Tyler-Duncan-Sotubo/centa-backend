import { CreateOffboardingDto } from './dto/create-offboarding.dto';
import { UpdateOffboardingDto } from './dto/update-offboarding.dto';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
export declare class OffboardingService {
    private readonly db;
    private readonly auditService;
    constructor(db: db, auditService: AuditService);
    create(createDto: CreateOffboardingDto, user: User): Promise<{
        id: string;
        companyId: string;
        employeeId: string;
        status: string | null;
        notes: string | null;
        completedAt: Date | null;
        startedAt: Date | null;
        terminationType: string | null;
        terminationReason: string | null;
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
            order: number | null;
            completed: boolean | null;
            completedAt: Date | null;
            isAssetReturnStep: boolean | null;
            sessionId: string;
            assetId: string | null;
        }[];
        id: string;
        companyId: string;
        employeeId: string;
        status: string | null;
        notes: string | null;
        completedAt: Date | null;
        startedAt: Date | null;
        terminationType: string | null;
        terminationReason: string | null;
    }>;
    update(id: string, dto: UpdateOffboardingDto, user: User): Promise<{
        id: string;
        employeeId: string;
        companyId: string;
        terminationType: string | null;
        terminationReason: string | null;
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
}
