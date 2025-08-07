import { OffboardingService } from './offboarding.service';
import { CreateOffboardingDto } from './dto/create-offboarding.dto';
import { UpdateOffboardingDto } from './dto/update-offboarding.dto';
import { BaseController } from 'src/common/interceptor/base.controller';
import { User } from 'src/common/types/user.type';
export declare class OffboardingController extends BaseController {
    private readonly offboardingService;
    constructor(offboardingService: OffboardingService);
    create(createOffboardingDto: CreateOffboardingDto, user: User): Promise<{
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
    findAll(user: User): Promise<{
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
    findOne(id: string, user: User): Promise<{
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
    update(id: string, updateOffboardingDto: UpdateOffboardingDto, user: User): Promise<{
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
    updateChecklist(checklistItemId: string, user: User): Promise<{
        message: string;
        sessionCompleted: boolean;
    }>;
    remove(id: string, user: User): Promise<{
        message: string;
    }>;
}
