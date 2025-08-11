import { db } from 'src/drizzle/types/drizzle';
import { User } from 'src/common/types/user.type';
import { UpsertEntryDto } from './dto/upsert-entry.dto';
export declare class AppraisalEntriesService {
    private readonly db;
    constructor(db: db);
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
        user: User;
    } | {
        message: string;
        data: {
            id: string;
            createdAt: Date | null;
            notes: string | null;
            competencyId: string;
            expectedLevelId: string;
            appraisalId: string;
            employeeLevelId: string | null;
            managerLevelId: string | null;
        };
        user?: undefined;
    }>;
    upsertEntries(appraisalId: string, entries: UpsertEntryDto[], user: User): Promise<{
        message: string;
        count: number;
        results: {
            message: string;
            data: any;
        }[];
    }>;
    private recalculateAppraisalStatus;
}
