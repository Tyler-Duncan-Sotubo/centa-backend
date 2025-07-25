import { AssetsRequestService } from './assets-request.service';
import { CreateAssetsRequestDto } from './dto/create-assets-request.dto';
import { UpdateAssetsRequestDto } from './dto/update-assets-request.dto';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class AssetsRequestController extends BaseController {
    private readonly assetsRequestService;
    constructor(assetsRequestService: AssetsRequestService);
    create(createAssetsRequestDto: CreateAssetsRequestDto, user: User): Promise<{
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string;
        employeeId: string;
        status: string | null;
        rejectionReason: string | null;
        notes: string | null;
        purpose: string;
        requestDate: string;
        assetType: string;
        urgency: string;
    }>;
    findAll(user: User): Promise<({
        id: string;
        employeeId: string;
        assetType: string;
        purpose: string;
        urgency: string;
        status: string | null;
        requestDate: string;
        createdAt: Date | null;
        employeeName: unknown;
        employeeEmail: any;
    } | {
        id: string;
        employeeId: string;
        assetType: string;
        purpose: string;
        urgency: string;
        status: string | null;
        requestDate: string;
        createdAt: Date | null;
        employeeName: unknown;
        employeeEmail: any;
    })[]>;
    findOne(id: string): Promise<{
        id: string;
        requestDate: string;
        assetType: string;
        purpose: string;
        urgency: string;
        notes: string | null;
        status: string | null;
        createdAt: Date | null;
        employeeId: string;
        companyId: string;
        rejectionReason: string | null;
        updatedAt: Date | null;
    }>;
    findByEmployeeId(id: string): Promise<{
        id: string;
        requestDate: string;
        assetType: string;
        purpose: string;
        urgency: string;
        notes: string | null;
        status: string | null;
        createdAt: Date | null;
        employeeId: string;
        companyId: string;
        rejectionReason: string | null;
        updatedAt: Date | null;
    }[]>;
    getApprovalStatus(id: string): Promise<{
        requestDate: string;
        approvalStatus: string | null;
        steps: {
            fallbackRoles: any;
            isUserEligible: any;
            isFallback: any;
            id: string;
            sequence: number;
            role: string;
            minApprovals: number;
            maxApprovals: number;
            createdAt: Date | null;
            status: string;
        }[];
    }>;
    approveExpense(id: string, action: 'approved' | 'rejected', remarks: string, user: User): Promise<string>;
    update(id: string, updateAssetsRequestDto: UpdateAssetsRequestDto, user: User): Promise<{
        id: string;
        requestDate: string;
        assetType: string;
        purpose: string;
        urgency: string;
        notes: string | null;
        status: string | null;
        createdAt: Date | null;
        employeeId: string;
        companyId: string;
        rejectionReason: string | null;
        updatedAt: Date | null;
    }>;
}
