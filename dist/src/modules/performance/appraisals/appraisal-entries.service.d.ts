import { db } from 'src/drizzle/types/drizzle';
import { User } from 'src/common/types/user.type';
import { UpsertEntryDto } from './dto/upsert-entry.dto';
import { AuditService } from 'src/modules/audit/audit.service';
export declare class AppraisalEntriesService {
    private readonly db;
    private readonly auditService;
    constructor(db: db, auditService: AuditService);
    getAppraisalEntriesWithExpectations(appraisalId: string): Promise<{
        competencyId: string;
        competencyName: string;
        expectedLevelId: string;
        expectedLevelName: string;
        employeeLevelId: string | null;
        employeeLevelName: string | null;
        managerLevelId: string | null;
        managerLevelName: string | null;
        notes: string;
    }[]>;
    upsertEntry(dto: UpsertEntryDto, appraisalId: string, user: User): Promise<{
        message: string;
        data: {
            id: string;
            appraisalId: string;
            competencyId: string;
            expectedLevelId: string;
            employeeLevelId: string | null;
            managerLevelId: string | null;
            notes: string | null;
            createdAt: Date | null;
        };
        status: {
            submittedByEmployee: boolean;
            submittedByManager: boolean;
            finalized: boolean;
        };
    }>;
    upsertEntries(appraisalId: string, entries: UpsertEntryDto[], user: User): Promise<{
        message: string;
        count: number;
        status: {
            submittedByEmployee: boolean;
            submittedByManager: boolean;
            finalized: boolean;
        };
    }>;
    private recalculateAppraisalStatus;
}
