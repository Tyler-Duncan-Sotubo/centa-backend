import { CreateAssetsReportDto } from './dto/create-assets-report.dto';
import { User } from 'src/common/types/user.type';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { AwsService } from 'src/common/aws/aws.service';
export declare class AssetsReportService {
    private readonly db;
    private readonly auditService;
    private readonly awsService;
    constructor(db: db, auditService: AuditService, awsService: AwsService);
    create(dto: CreateAssetsReportDto, user: User): Promise<{
        id: string;
        updatedAt: Date | null;
        companyId: string;
        description: string;
        employeeId: string;
        documentUrl: string | null;
        status: string | null;
        assetId: string;
        reportType: string;
        reportedAt: Date | null;
        resolvedAt: Date | null;
    }>;
    findAll(companyId: string): Promise<({
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
    update(id: string, user: User, status?: string, assetStatus?: string): Promise<{
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
