import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateAssetsReportDto } from './dto/create-assets-report.dto';
import { User } from 'src/common/types/user.type';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { eq, desc, sql, and } from 'drizzle-orm';
import { assetReports } from '../schema/asset-reports.schema';
import { AwsService } from 'src/common/aws/aws.service';
import { assets } from '../schema/assets.schema';
import { employees } from 'src/drizzle/schema';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class AssetsReportService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly awsService: AwsService,
    private readonly cache: CacheService, // 👈 cache
  ) {}

  private tags(companyId: string) {
    return [
      `company:${companyId}:assets`,
      `company:${companyId}:assets:reports`,
    ];
  }

  async create(dto: CreateAssetsReportDto, user: User) {
    // Uniqueness check
    const [existingReport] = await this.db
      .select()
      .from(assetReports)
      .where(eq(assetReports.assetId, dto.assetId));

    if (existingReport) {
      throw new BadRequestException('Report for this asset already exists');
    }

    // Upload (if base64 image)
    let documentUrl = dto.documentUrl;
    if (documentUrl?.startsWith('data:image')) {
      const fileName = `asset-report-${Date.now()}.jpg`;
      documentUrl = await this.awsService.uploadImageToS3(
        dto.employeeId,
        fileName,
        documentUrl,
      );
    }

    const [newReport] = await this.db
      .insert(assetReports)
      .values({
        employeeId: dto.employeeId,
        assetId: dto.assetId,
        reportType: dto.reportType,
        description: dto.description,
        documentUrl,
        reportedAt: new Date(),
        companyId: user.companyId,
      })
      .returning()
      .execute();

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

    // Any write -> bump company version (invalidates cached lists/details)
    await this.cache.bumpCompanyVersion(user.companyId);

    return newReport;
  }

  async findAll(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['assets', 'reports', 'list'],
      async () => {
        return this.db
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
      },
      { tags: this.tags(companyId) },
    );
  }

  async findOne(id: string, companyId?: string) {
    // If companyId is known (e.g., from auth), include it in the cache key and SQL where
    const keyParts = companyId
      ? ['assets', 'reports', 'one', id]
      : ['assets', 'reports', 'one-no-company', id];

    return this.cache.getOrSetVersioned(
      companyId ?? 'global',
      keyParts,
      async () => {
        let rows;
        if (companyId) {
          rows = await this.db
            .select()
            .from(assetReports)
            .where(
              and(
                eq(assetReports.id, id),
                eq(assetReports.companyId, companyId),
              ),
            )
            .execute();
        } else {
          rows = await this.db
            .select()
            .from(assetReports)
            .where(eq(assetReports.id, id))
            .execute();
        }

        const report = rows[0];
        if (!report) {
          throw new BadRequestException(`Report with ID ${id} not found`);
        }
        return report;
      },
      // small TTL is fine for single records if you prefer
      {
        tags: companyId ? this.tags(companyId) : undefined,
      },
    );
  }

  async update(id: string, user: User, status?: string, assetStatus?: string) {
    // Make sure the record exists (and warm per-id cache)
    const report = await this.findOne(id, user.companyId);

    // Update report
    const [updatedReport] = await this.db
      .update(assetReports)
      .set({
        status: status ?? report.status,
        updatedAt: new Date(),
      })
      .where(eq(assetReports.id, id))
      .returning()
      .execute();

    // Optionally update linked asset
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

    // Any write -> bump version to invalidate lists and details
    await this.cache.bumpCompanyVersion(user.companyId);

    return updatedReport;
  }
}
