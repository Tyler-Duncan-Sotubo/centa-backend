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
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class AssetsReportService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly awsService: AwsService,
    private readonly cache: CacheService,
  ) {}

  // -------- cache keys + helpers --------
  private listKey(companyId: string) {
    return `company:${companyId}:asset-reports:list`;
  }
  private oneKey(reportId: string) {
    return `asset-report:${reportId}:detail`;
  }
  private async invalidateAfterChange(companyId: string, reportId?: string) {
    const jobs = [this.cache.del(this.listKey(companyId))];
    if (reportId) jobs.push(this.cache.del(this.oneKey(reportId)));
    await Promise.allSettled(jobs);
  }

  async create(dto: CreateAssetsReportDto, user: User) {
    const [existingReport] = await this.db
      .select()
      .from(assetReports)
      .where(eq(assetReports.assetId, dto.assetId));

    if (existingReport) {
      throw new BadRequestException('Report for this asset already exists');
    }

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

    // bust caches
    await this.invalidateAfterChange(user.companyId, newReport.id);

    return newReport;
  }

  async findAll(companyId: string) {
    return this.cache.getOrSetCache(
      this.listKey(companyId),
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
      // { ttl: 60 }
    );
  }

  async findOne(id: string) {
    return this.cache.getOrSetCache(
      this.oneKey(id),
      async () => {
        const [report] = await this.db
          .select()
          .from(assetReports)
          .where(eq(assetReports.id, id))
          .execute();

        if (!report) {
          throw new BadRequestException(`Report with ID ${id} not found`);
        }

        return report;
      },
      // { ttl: 120 }
    );
  }

  async update(id: string, user: User, status?: string, assetStatus?: string) {
    const report = await this.findOne(id); // uses cache but we only need existence; mutation will burst

    const [updatedReport] = await this.db
      .update(assetReports)
      .set({
        status: status ?? (report as any).status,
        updatedAt: new Date(),
      })
      .where(eq(assetReports.id, id))
      .returning()
      .execute();

    if (assetStatus) {
      await this.db
        .update(assets)
        .set({
          status: assetStatus,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(assets.id, (report as any).assetId))
        .execute();
      // optional: if your AssetsService has caching, consider invalidating its keys here too
      // via an AssetsCache helper or event.
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

    // bust caches
    await this.invalidateAfterChange(updatedReport.companyId, updatedReport.id);

    return updatedReport;
  }
}
