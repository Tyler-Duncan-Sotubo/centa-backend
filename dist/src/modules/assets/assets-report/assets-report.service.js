"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetsReportService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const audit_service_1 = require("../../audit/audit.service");
const drizzle_orm_1 = require("drizzle-orm");
const asset_reports_schema_1 = require("../schema/asset-reports.schema");
const aws_service_1 = require("../../../common/aws/aws.service");
const assets_schema_1 = require("../schema/assets.schema");
const schema_1 = require("../../../drizzle/schema");
const cache_service_1 = require("../../../common/cache/cache.service");
let AssetsReportService = class AssetsReportService {
    constructor(db, auditService, awsService, cache) {
        this.db = db;
        this.auditService = auditService;
        this.awsService = awsService;
        this.cache = cache;
    }
    listKey(companyId) {
        return `company:${companyId}:asset-reports:list`;
    }
    oneKey(reportId) {
        return `asset-report:${reportId}:detail`;
    }
    async invalidateAfterChange(companyId, reportId) {
        const jobs = [this.cache.del(this.listKey(companyId))];
        if (reportId)
            jobs.push(this.cache.del(this.oneKey(reportId)));
        await Promise.allSettled(jobs);
    }
    async create(dto, user) {
        const [existingReport] = await this.db
            .select()
            .from(asset_reports_schema_1.assetReports)
            .where((0, drizzle_orm_1.eq)(asset_reports_schema_1.assetReports.assetId, dto.assetId));
        if (existingReport) {
            throw new common_1.BadRequestException('Report for this asset already exists');
        }
        let documentUrl = dto.documentUrl;
        if (documentUrl?.startsWith('data:image')) {
            const fileName = `asset-report-${Date.now()}.jpg`;
            documentUrl = await this.awsService.uploadImageToS3(dto.employeeId, fileName, documentUrl);
        }
        const [newReport] = await this.db
            .insert(asset_reports_schema_1.assetReports)
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
        await this.invalidateAfterChange(user.companyId, newReport.id);
        return newReport;
    }
    async findAll(companyId) {
        return this.cache.getOrSetCache(this.listKey(companyId), async () => {
            return this.db
                .select({
                id: asset_reports_schema_1.assetReports.id,
                employeeId: asset_reports_schema_1.assetReports.employeeId,
                assetId: asset_reports_schema_1.assetReports.assetId,
                reportType: asset_reports_schema_1.assetReports.reportType,
                description: asset_reports_schema_1.assetReports.description,
                documentUrl: asset_reports_schema_1.assetReports.documentUrl,
                reportedAt: asset_reports_schema_1.assetReports.reportedAt,
                employeeName: (0, drizzle_orm_1.sql) `concat(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
                employeeEmail: schema_1.employees.email,
                assetName: assets_schema_1.assets.name,
                status: asset_reports_schema_1.assetReports.status,
                assetStatus: assets_schema_1.assets.status,
            })
                .from(asset_reports_schema_1.assetReports)
                .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(asset_reports_schema_1.assetReports.employeeId, schema_1.employees.id))
                .leftJoin(assets_schema_1.assets, (0, drizzle_orm_1.eq)(asset_reports_schema_1.assetReports.assetId, assets_schema_1.assets.id))
                .where((0, drizzle_orm_1.eq)(asset_reports_schema_1.assetReports.companyId, companyId))
                .orderBy((0, drizzle_orm_1.desc)(asset_reports_schema_1.assetReports.reportedAt))
                .execute();
        });
    }
    async findOne(id) {
        return this.cache.getOrSetCache(this.oneKey(id), async () => {
            const [report] = await this.db
                .select()
                .from(asset_reports_schema_1.assetReports)
                .where((0, drizzle_orm_1.eq)(asset_reports_schema_1.assetReports.id, id))
                .execute();
            if (!report) {
                throw new common_1.BadRequestException(`Report with ID ${id} not found`);
            }
            return report;
        });
    }
    async update(id, user, status, assetStatus) {
        const report = await this.findOne(id);
        const [updatedReport] = await this.db
            .update(asset_reports_schema_1.assetReports)
            .set({
            status: status ?? report.status,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(asset_reports_schema_1.assetReports.id, id))
            .returning()
            .execute();
        if (assetStatus) {
            await this.db
                .update(assets_schema_1.assets)
                .set({
                status: assetStatus,
                updatedAt: new Date().toISOString(),
            })
                .where((0, drizzle_orm_1.eq)(assets_schema_1.assets.id, report.assetId))
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
        await this.invalidateAfterChange(updatedReport.companyId, updatedReport.id);
        return updatedReport;
    }
};
exports.AssetsReportService = AssetsReportService;
exports.AssetsReportService = AssetsReportService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        aws_service_1.AwsService,
        cache_service_1.CacheService])
], AssetsReportService);
//# sourceMappingURL=assets-report.service.js.map