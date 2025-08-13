import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateAssetsReportDto } from './dto/create-assets-report.dto';
import { User } from 'src/common/types/user.type';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { eq, desc, sql } from 'drizzle-orm';
import { assetReports } from '../schema/asset-reports.schema';
import { AwsService } from 'src/common/aws/aws.service';
import { assets } from '../schema/assets.schema';
import { employees } from 'src/drizzle/schema';

@Injectable()
export class AssetsReportService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly awsService: AwsService,
  ) {}

  async create(dto: CreateAssetsReportDto, user: User) {
    // Check if the report already exists for the given employee and asset
    const [existingReport] = await this.db
      .select()
      .from(assetReports)
      .where(eq(assetReports.assetId, dto.assetId));

    if (existingReport) {
      throw new BadRequestException('Report for this asset already exists');
    }

    let documentUrl = dto.documentUrl;

    // Handle base64 file upload to AWS if document is provided
    if (documentUrl?.startsWith('data:image')) {
      const fileName = `asset-report-${Date.now()}.jpg`; // or .png based on content type
      documentUrl = await this.awsService.uploadImageToS3(
        dto.employeeId,
        fileName,
        documentUrl,
      );
    }

    // Create the report
    const [newReport] = await this.db
      .insert(assetReports)
      .values({
        employeeId: dto.employeeId,
        assetId: dto.assetId,
        reportType: dto.reportType,
        description: dto.description,
        documentUrl, // <-- updated here
        reportedAt: new Date(),
        companyId: user.companyId,
      })
      .returning()
      .execute();

    // Log the action
    await this.auditService.logAction({
      action: 'create',
      entity: 'asset_report',
      entityId: newReport.id,
      userId: user.id,
      details: `Asset report created for employee ${dto.employeeId} and asset ${dto.assetId}`,
      changes: {
        employeeId: dto.employeeId,
        assetId: dto.assetId,
        reportType: dto.reportType,
        description: dto.description,
        documentUrl,
      },
    });

    return newReport;
  }

  async findAll(companyId: string) {
    const allReports = await this.db
      .select({
        id: assetReports.id,
        employeeId: assetReports.employeeId,
        assetId: assetReports.assetId,
        reportType: assetReports.reportType,
        description: assetReports.description,
        documentUrl: assetReports.documentUrl,
        reportedAt: assetReports.reportedAt,
        employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
        employeeEmail: employees.email,
        assetName: assets.name,
        status: assetReports.status,
        assetStatus: assets.status,
      })
      .from(assetReports)
      .innerJoin(employees, eq(assetReports.employeeId, employees.id))
      .leftJoin(assets, eq(assetReports.assetId, assets.id))
      .where(eq(assetReports.companyId, companyId))
      .orderBy(desc(assetReports.reportedAt))
      .execute();

    return allReports;
  }

  async findOne(id: string) {
    const [report] = await this.db
      .select()
      .from(assetReports)
      .where(eq(assetReports.id, id))
      .execute();

    if (!report) {
      throw new BadRequestException(`Report with ID ${id} not found`);
    }

    return report;
  }

  async update(id: string, user: User, status?: string, assetStatus?: string) {
    // Find the existing report
    const report = await this.findOne(id.toString());

    // Update the asset report status
    const [updatedReport] = await this.db
      .update(assetReports)
      .set({
        status: status ?? report.status, // if provided
        updatedAt: new Date(),
      })
      .where(eq(assetReports.id, id))
      .returning()
      .execute();

    // Update asset status if provided
    if (assetStatus) {
      await this.db
        .update(assets)
        .set({
          status: assetStatus,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(assets.id, report.assetId))
        .execute();
    }

    // Audit log
    await this.auditService.logAction({
      action: 'update',
      entity: 'asset_report',
      entityId: updatedReport.id,
      userId: user.id,
      details: `Asset report status updated for employee ${updatedReport.employeeId} and asset ${updatedReport.assetId}`,
      changes: {
        reportStatus: status ?? 'unchanged',
        assetStatus: assetStatus ?? 'unchanged',
      },
    });

    return updatedReport;
  }
}
