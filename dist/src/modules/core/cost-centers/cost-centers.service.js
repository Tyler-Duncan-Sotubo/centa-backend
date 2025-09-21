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
exports.CostCentersService = void 0;
const common_1 = require("@nestjs/common");
const create_cost_center_dto_1 = require("./dto/create-cost-center.dto");
const base_crud_service_1 = require("../../../common/services/base-crud.service");
const audit_service_1 = require("../../audit/audit.service");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../schema");
const drizzle_orm_1 = require("drizzle-orm");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const company_settings_service_1 = require("../../../company-settings/company-settings.service");
const cache_service_1 = require("../../../common/cache/cache.service");
let CostCentersService = class CostCentersService extends base_crud_service_1.BaseCrudService {
    constructor(db, audit, companySettings, cache) {
        super(db, audit);
        this.companySettings = companySettings;
        this.cache = cache;
        this.table = schema_1.costCenters;
    }
    tags(companyId) {
        return [`company:${companyId}:cost-centers`];
    }
    async create(companyId, dto) {
        const { code, name, budget } = dto;
        const [created] = await this.db
            .insert(schema_1.costCenters)
            .values({ code, name, budget, companyId })
            .returning({ id: schema_1.costCenters.id })
            .execute();
        await this.companySettings.setOnboardingTask(companyId, 'payroll', 'cost_center', 'done');
        await this.cache.bumpCompanyVersion(companyId);
        return created;
    }
    async bulkCreate(companyId, rows) {
        const dtos = [];
        for (const row of rows) {
            const dto = (0, class_transformer_1.plainToInstance)(create_cost_center_dto_1.CreateCostCenterDto, {
                code: row['Code'] || row['code'],
                name: row['Name'] || row['name'],
                budget: Number(row['Budget'] || row['budget'] || 0),
            });
            const errs = await (0, class_validator_1.validate)(dto);
            if (errs.length) {
                throw new common_1.BadRequestException('Invalid CSV format or data: ' + JSON.stringify(errs));
            }
            dtos.push(dto);
        }
        const codes = dtos.map((d) => d.code);
        const duplicates = await this.db
            .select({ code: schema_1.costCenters.code })
            .from(schema_1.costCenters)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.costCenters.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.costCenters.code, codes)))
            .execute();
        if (duplicates.length) {
            const duplicateCodes = duplicates.map((d) => d.code);
            throw new common_1.BadRequestException(`Cost center codes already exist: ${duplicateCodes.join(', ')}`);
        }
        const inserted = await this.db.transaction(async (trx) => {
            const values = dtos.map((d) => ({
                companyId,
                code: d.code,
                name: d.name,
                budget: d.budget,
            }));
            return trx
                .insert(schema_1.costCenters)
                .values(values)
                .returning({
                id: schema_1.costCenters.id,
                code: schema_1.costCenters.code,
                name: schema_1.costCenters.name,
                budget: schema_1.costCenters.budget,
            })
                .execute();
        });
        await this.companySettings.setSetting(companyId, 'onboarding_cost_center', true);
        await this.cache.bumpCompanyVersion(companyId);
        return inserted;
    }
    async findAll(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['cost-centers', 'all'], () => this.db
            .select({
            id: schema_1.costCenters.id,
            code: schema_1.costCenters.code,
            name: schema_1.costCenters.name,
            budget: schema_1.costCenters.budget,
        })
            .from(schema_1.costCenters)
            .where((0, drizzle_orm_1.eq)(schema_1.costCenters.companyId, companyId))
            .execute(), { tags: this.tags(companyId) });
    }
    async findOne(companyId, id) {
        return this.cache.getOrSetVersioned(companyId, ['cost-centers', 'one', id], async () => {
            const [cc] = await this.db
                .select({
                id: schema_1.costCenters.id,
                code: schema_1.costCenters.code,
                name: schema_1.costCenters.name,
                budget: schema_1.costCenters.budget,
            })
                .from(schema_1.costCenters)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.costCenters.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.costCenters.id, id)))
                .execute();
            if (!cc)
                throw new common_1.NotFoundException(`Cost center ${id} not found`);
            return cc;
        }, { tags: this.tags(companyId) });
    }
    async update(companyId, id, dto, userId, ip) {
        const result = await this.updateWithAudit(companyId, id, { code: dto.code, name: dto.name, budget: dto.budget }, {
            entity: 'CostCenter',
            action: 'UpdateCostCenter',
            fields: ['code', 'name', 'budget'],
        }, userId, ip);
        await this.cache.bumpCompanyVersion(companyId);
        return result;
    }
    async remove(user, id) {
        const [deleted] = await this.db
            .delete(schema_1.costCenters)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.costCenters.companyId, user.companyId), (0, drizzle_orm_1.eq)(schema_1.costCenters.id, id)))
            .returning({
            id: schema_1.costCenters.id,
            code: schema_1.costCenters.code,
            name: schema_1.costCenters.name,
        })
            .execute();
        if (!deleted) {
            throw new common_1.NotFoundException(`Cost Centers ${id} not found`);
        }
        await this.audit.logAction({
            entity: 'CostCenter',
            action: 'Delete',
            details: 'Cost center deleted',
            userId: user.id,
            changes: {
                before: deleted,
                after: null,
            },
        });
        await this.cache.bumpCompanyVersion(user.companyId);
        return { id: deleted.id };
    }
};
exports.CostCentersService = CostCentersService;
exports.CostCentersService = CostCentersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        company_settings_service_1.CompanySettingsService,
        cache_service_1.CacheService])
], CostCentersService);
//# sourceMappingURL=cost-centers.service.js.map