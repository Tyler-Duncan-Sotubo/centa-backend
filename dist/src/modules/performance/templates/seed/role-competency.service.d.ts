import { db } from 'src/drizzle/types/drizzle';
import { User } from 'src/common/types/user.type';
import { CreateRoleExpectationDto } from './dto/create-role-expectation.dto';
import { UpdateRoleExpectationDto } from './dto/update-role-expectation.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';
export declare class RoleCompetencyExpectationService {
    private readonly db;
    private readonly auditService;
    private readonly logger;
    private readonly cache;
    constructor(db: db, auditService: AuditService, logger: PinoLogger, cache: CacheService);
    private listKey;
    private settingsKey;
    private fieldsKey;
    private levelsKey;
    private burst;
    create(companyId: string, dto: CreateRoleExpectationDto, user: User): Promise<{
        id: string;
        companyId: string | null;
        roleId: string;
        competencyId: string;
        expectedLevelId: string;
    }>;
    update(id: string, dto: UpdateRoleExpectationDto, user: User): Promise<{
        message: string;
    }>;
    delete(id: string, user: User): Promise<{
        message: string;
    }>;
    list(companyId: string): Promise<{
        id: string;
        companyId: string | null;
        roleId: string;
        competencyId: string;
        expectedLevelId: string;
    }[]>;
    getFrameworkSettings(companyId: string): Promise<{
        roles: {
            id: string;
            title: string;
        }[];
        expectationsByRole: Record<string, {
            id: string;
            competencyName: string;
            levelName: string;
            competencyId: string;
        }[]>;
    }>;
    getFrameworkFields(companyId: string): Promise<{
        competencies: {
            id: string;
            name: string;
        }[];
        levels: {
            id: string;
            name: string;
        }[];
    }>;
    getAllCompetencyLevels(): Promise<{
        id: string;
        name: string;
    }[]>;
}
