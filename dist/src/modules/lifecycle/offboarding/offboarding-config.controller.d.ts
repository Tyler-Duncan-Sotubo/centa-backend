import { OffboardingConfigService } from './offboarding-config.service';
import { User } from 'src/common/types/user.type';
import { OffboardingSeederService } from './offboarding-seeder.service';
import { CreateOffboardingConfigDto } from './dto/create-offboarding-config.dto';
import { UpdateOffboardingConfigDto } from './dto/update-offboarding-config.dto';
import { OffboardingChecklistItemDto } from './dto/offboarding-checklist.dto';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class OffboardingConfigController extends BaseController {
    private readonly configService;
    private readonly seederService;
    constructor(configService: OffboardingConfigService, seederService: OffboardingSeederService);
    seedDefaults(): Promise<void>;
    getAll(user: User): Promise<{
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
    updateType(id: string, user: User, dto: UpdateOffboardingConfigDto): Promise<{
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
    updateReason(id: string, user: User, dto: UpdateOffboardingConfigDto): Promise<{
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
    updateChecklistItem(id: string, user: User, dto: OffboardingChecklistItemDto): Promise<{
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
