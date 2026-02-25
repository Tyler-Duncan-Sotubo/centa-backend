import { db } from 'src/drizzle/types/drizzle';
import { CreateCompetencyDto } from './dto/create-competency.dto';
import { UpdateCompetencyDto } from './dto/update-competency.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
export declare class PerformanceCompetencyService {
    private readonly db;
    private readonly auditService;
    constructor(db: db, auditService: AuditService);
    create(companyId: string | null, dto: CreateCompetencyDto, userId: string): Promise<{
        name: string;
        id: string;
        createdAt: Date | null;
        isActive: boolean | null;
        companyId: string | null;
        description: string | null;
        isGlobal: boolean | null;
    }>;
    getOnlyCompetencies(companyId: string): Promise<{
        id: string;
        name: string;
    }[]>;
    getCompetenciesWithQuestions(companyId: string): Promise<{
        questions: {
            id: string;
            companyId: string | null;
            competencyId: string | null;
            question: string;
            type: string;
            isMandatory: boolean | null;
            allowNotes: boolean | null;
            isActive: boolean | null;
            isGlobal: boolean | null;
            createdAt: Date | null;
        }[];
        id: string;
        companyId: string | null;
        name: string;
        description: string | null;
        isActive: boolean | null;
        isGlobal: boolean | null;
        createdAt: Date | null;
    }[]>;
    getById(id: string, companyId: string): Promise<{
        id: string;
        companyId: string | null;
        name: string;
        description: string | null;
        isActive: boolean | null;
        isGlobal: boolean | null;
        createdAt: Date | null;
    }>;
    update(id: string, user: User, data: UpdateCompetencyDto): Promise<{
        message: string;
    }>;
    delete(id: string, user: User): Promise<{
        message: string;
    }>;
    seedGlobalCompetencies(): Promise<{
        message: string;
    }>;
    seedSystemLevels(): Promise<{
        message: string;
    }>;
    getAllCompetencyLevels(): Promise<{
        id: string;
        name: string;
        weight: number;
    }[]>;
}
