import { AssetsReportService } from './assets-report.service';
import { CreateAssetsReportDto } from './dto/create-assets-report.dto';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class AssetsReportController extends BaseController {
    private readonly assetsReportService;
    constructor(assetsReportService: AssetsReportService);
    create(createAssetsReportDto: CreateAssetsReportDto, user: User): Promise<{
        id: string;
        updatedAt: Date | null;
        companyId: string;
        description: string;
        employeeId: string;
        status: string | null;
        assetId: string;
        documentUrl: string | null;
        reportType: string;
        reportedAt: Date | null;
        resolvedAt: Date | null;
    }>;
    findAll(user: User): Promise<({
        id: string;
        employeeId: string;
        assetId: string;
        reportType: string;
        description: string;
        documentUrl: string | null;
        reportedAt: Date | null;
        employeeName: string;
        employeeEmail: any;
        assetName: string | null;
        status: string | null;
        assetStatus: string | null;
    } | {
        id: string;
        employeeId: string;
        assetId: string;
        reportType: string;
        description: string;
        documentUrl: string | null;
        reportedAt: Date | null;
        employeeName: string;
        employeeEmail: any;
        assetName: string | null;
        status: string | null;
        assetStatus: string | null;
    })[]>;
    findOne(id: string): Promise<{
        id: string;
        employeeId: string;
        companyId: string;
        assetId: string;
        reportType: string;
        description: string;
        documentUrl: string | null;
        status: string | null;
        reportedAt: Date | null;
        resolvedAt: Date | null;
        updatedAt: Date | null;
    }>;
    update(id: string, user: User, status: string, assetStatus?: string): Promise<{
        id: string;
        employeeId: string;
        companyId: string;
        assetId: string;
        reportType: string;
        description: string;
        documentUrl: string | null;
        status: string | null;
        reportedAt: Date | null;
        resolvedAt: Date | null;
        updatedAt: Date | null;
    }>;
}
