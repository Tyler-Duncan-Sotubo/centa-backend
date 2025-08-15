import { OffboardingService } from './offboarding.service';
import { UpdateOffboardingDto } from './dto/update-offboarding.dto';
import { BaseController } from 'src/common/interceptor/base.controller';
import { User } from 'src/common/types/user.type';
import { CreateOffboardingBeginDto } from './dto/create-offboarding.dto';
import { AddOffboardingDetailsDto } from './dto/add-offboarding-details.dto';
export declare class OffboardingController extends BaseController {
    private readonly offboardingService;
    constructor(offboardingService: OffboardingService);
    begin(dto: CreateOffboardingBeginDto, user: User): Promise<{
        id: string;
        companyId: string;
        status: string | null;
        employeeId: string;
        notes: string | null;
        startedAt: Date | null;
        completedAt: Date | null;
        terminationType: string | null;
        terminationReason: string | null;
        terminationDate: string;
        eligibleForRehire: boolean | null;
    }>;
    addDetails(sessionId: string, dto: AddOffboardingDetailsDto, user: User): Promise<{
        sessionId: string;
        checklistCount: number;
    }>;
    cancel(sessionId: string, user: User): Promise<{
        deleted: boolean;
        sessionId: string;
    }>;
    findByEmployeeId(user: User, employeeId: string): Promise<{
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
            completed: boolean | null;
            order: number | null;
            completedAt: Date | null;
            isAssetReturnStep: boolean | null;
            sessionId: string;
            assetId: string | null;
        }[];
        id: string;
        companyId: string;
        status: string | null;
        employeeId: string;
        notes: string | null;
        startedAt: Date | null;
        completedAt: Date | null;
        terminationType: string | null;
        terminationReason: string | null;
        terminationDate: string;
        eligibleForRehire: boolean | null;
    }>;
    update(id: string, updateOffboardingDto: UpdateOffboardingDto, user: User): Promise<{
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
    updateChecklist(checklistItemId: string, user: User): Promise<{
        message: string;
        sessionCompleted: boolean;
    }>;
    remove(id: string, user: User): Promise<{
        message: string;
    }>;
}
