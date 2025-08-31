import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { OffboardingChecklistItemDto } from './dto/offboarding-checklist.dto';
import { CreateOffboardingConfigDto } from './dto/create-offboarding-config.dto';
import { UpdateOffboardingConfigDto } from './dto/update-offboarding-config.dto';
export declare class OffboardingConfigService {
    private readonly db;
    private readonly auditService;
    constructor(db: db, auditService: AuditService);
    getAllTerminationConfig(companyId: string): Promise<{
        types: {
            id: string;
            name: string;
            description: string | null;
            isGlobal: boolean | null;
            companyId: string | null;
        }[];
        reasons: {
            id: string;
            name: string;
            description: string | null;
            isGlobal: boolean | null;
            companyId: string | null;
        }[];
        checklist: {
            id: string;
            name: string;
            description: string | null;
            order: number | null;
            isAssetReturnStep: boolean | null;
            isGlobal: boolean | null;
            companyId: string | null;
            createdAt: Date | null;
        }[];
    }>;
    createType(user: User, dto: CreateOffboardingConfigDto): Promise<{
        id: string;
        name: string;
        companyId: string | null;
        description: string | null;
        isGlobal: boolean | null;
    }[]>;
    updateType(id: string, dto: UpdateOffboardingConfigDto, user: User): Promise<{
        id: string;
        name: string;
        description: string | null;
        isGlobal: boolean | null;
        companyId: string | null;
    }[]>;
    deleteType(id: string, user: User): Promise<void>;
    createReason(user: User, dto: CreateOffboardingConfigDto): Promise<{
        id: string;
        name: string;
        companyId: string | null;
        description: string | null;
        isGlobal: boolean | null;
    }[]>;
    updateReason(id: string, dto: UpdateOffboardingConfigDto, user: User): Promise<{
        id: string;
        name: string;
        description: string | null;
        isGlobal: boolean | null;
        companyId: string | null;
    }[]>;
    deleteReason(id: string, user: User): Promise<void>;
    createChecklistItem(user: User, dto: OffboardingChecklistItemDto): Promise<{
        id: string;
        name: string;
        createdAt: Date | null;
        companyId: string | null;
        description: string | null;
        isGlobal: boolean | null;
        order: number | null;
        isAssetReturnStep: boolean | null;
    }>;
    updateChecklistItem(id: string, data: OffboardingChecklistItemDto, user: User): Promise<{
        id: string;
        name: string;
        description: string | null;
        order: number | null;
        isAssetReturnStep: boolean | null;
        isGlobal: boolean | null;
        companyId: string | null;
        createdAt: Date | null;
    }>;
    deleteChecklistItem(id: string, user: User): Promise<void>;
}
