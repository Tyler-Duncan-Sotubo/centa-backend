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
var CostCentersService_1;
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
const nestjs_pino_1 = require("nestjs-pino");
let CostCentersService = CostCentersService_1 = class CostCentersService extends base_crud_service_1.BaseCrudService {
    constructor(db, audit, companySettings, cache, logger) {
        super(db, audit);
        this.companySettings = companySettings;
        this.cache = cache;
        this.logger = logger;
        this.table = schema_1.costCenters;
        this.logger.setContext(CostCentersService_1.name);
    }
    listKey(companyId) {
        return `cc:${companyId}:list`;
    }
    oneKey(companyId, id) {
        return `cc:${companyId}:one:${id}`;
    }
    async burst(companyId, id) {
        const jobs = [this.cache.del(this.listKey(companyId))];
        if (id)
            jobs.push(this.cache.del(this.oneKey(companyId, id)));
        await Promise.allSettled(jobs);
        this.logger.debug({ companyId, id }, 'cost-centers:cache:burst');
    }
    async create(companyId, dto) {
        this.logger.info({ companyId, dto }, 'cost-centers:create:start');
        const { code, name, budget } = dto;
        const [created] = await this.db
            .insert(schema_1.costCenters)
            .values({ code, name, budget, companyId })
            .returning({ id: schema_1.costCenters.id })
            .execute();
        await this.companySettings.setSetting(companyId, 'onboarding_cost_center', true);
        await this.burst(companyId, created.id);
        this.logger.info({ id: created.id }, 'cost-centers:create:done');
        return created;
    }
    async bulkCreate(companyId, rows) {
        this.logger.info({ companyId, rows: rows?.length }, 'cost-centers:bulkCreate:start');
        const dtos = [];
        for (const row of rows) {
            const dto = (0, class_transformer_1.plainToInstance)(create_cost_center_dto_1.CreateCostCenterDto, {
                code: row['Code'] || row['code'],
                name: row['Name'] || row['name'],
                budget: Number(row['Budget'] || row['budget'] || 0),
            });
            const errs = await (0, class_validator_1.validate)(dto);
            if (errs.length) {
                this.logger.warn({ errs }, 'cost-centers:bulkCreate:validation-error');
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
            this.logger.warn({ duplicateCodes }, 'cost-centers:bulkCreate:duplicates');
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
        await this.burst(companyId);
        this.logger.info({ count: inserted.length }, 'cost-centers:bulkCreate:done');
        return inserted;
    }
    async update(companyId, id, dto, userId, ip) {
        this.logger.info({ companyId, id, userId }, 'cost-centers:update:start');
        const result = await this.updateWithAudit(companyId, id, { code: dto.code, name: dto.name, budget: dto.budget }, {
            entity: 'CostCenter',
            action: 'UpdateCostCenter',
            fields: ['code', 'name', 'budget'],
        }, userId, ip);
        await this.burst(companyId, id);
        this.logger.info({ id }, 'cost-centers:update:done');
        return result;
    }
    async remove(user, id) {
        this.logger.info({ companyId: user.companyId, id, userId: user.id }, 'cost-centers:remove:start');
        const [deleted] = await this.db
            .delete(schema_1.costCenters)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.costCenters.companyId, user.companyId), (0, drizzle_orm_1.eq)(schema_1.costCenters.id, id)))
            .returning({
            id: schema_1.costCenters.id,
            code: schema_1.costCenters.code,
            name: schema_1.costCenters.name,
            budget: schema_1.costCenters.budget,
        })
            .execute();
        if (!deleted) {
            this.logger.warn({ id }, 'cost-centers:remove:not-found');
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
        await this.burst(user.companyId, id);
        this.logger.info({ id }, 'cost-centers:remove:done');
        return { id: deleted.id };
    }
    async findAll(companyId) {
        const key = this.listKey(companyId);
        this.logger.debug({ companyId, key }, 'cost-centers:findAll:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const rows = await this.db
                .select({
                id: schema_1.costCenters.id,
                code: schema_1.costCenters.code,
                name: schema_1.costCenters.name,
                budget: schema_1.costCenters.budget,
            })
                .from(schema_1.costCenters)
                .where((0, drizzle_orm_1.eq)(schema_1.costCenters.companyId, companyId))
                .execute();
            this.logger.debug({ companyId, count: rows.length }, 'cost-centers:findAll:db:done');
            return rows;
        });
    }
    async findOne(companyId, id) {
        const key = this.oneKey(companyId, id);
        this.logger.debug({ companyId, id, key }, 'cost-centers:findOne:cache:get');
        return this.cache.getOrSetCache(key, async () => {
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
            if (!cc) {
                this.logger.warn({ companyId, id }, 'cost-centers:findOne:not-found');
                throw new common_1.NotFoundException(`Cost center ${id} not found`);
            }
            this.logger.debug({ id }, 'cost-centers:findOne:db:done');
            return cc;
        });
    }
};
exports.CostCentersService = CostCentersService;
exports.CostCentersService = CostCentersService = CostCentersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        company_settings_service_1.CompanySettingsService,
        cache_service_1.CacheService,
        nestjs_pino_1.PinoLogger])
], CostCentersService);
//# sourceMappingURL=cost-centers.service.js.map