import { db } from 'src/drizzle/types/drizzle';
import { CreateCompetencyDto } from './dto/create-competency.dto';
import { UpdateCompetencyDto } from './dto/update-competency.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';
export declare class PerformanceCompetencyService {
    private readonly db;
    private readonly auditService;
    private readonly logger;
    private readonly cache;
    constructor(db: db, auditService: AuditService, logger: PinoLogger, cache: CacheService);
    private onlyListKey;
    private withQListKey;
    private oneKey;
    private levelsKey;
    private burst;
    create(companyId: string | null, dto: CreateCompetencyDto, userId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date | null;
        isActive: boolean | null;
        companyId: string | null;
        description: string | null;
        isGlobal: boolean | null;
    }>;
    update(id: string, user: User, data: UpdateCompetencyDto): Promise<{
        id: string;
        companyId: string | null;
        name: string;
        description: string | null;
        isActive: boolean | null;
        isGlobal: boolean | null;
        createdAt: Date | null;
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
    getAllCompetencyLevels(): Promise<{
        id: string;
        name: string;
        weight: number;
    }[]>;
}
