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
var CompanyTaxService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyTaxService = void 0;
const common_1 = require("@nestjs/common");
const audit_service_1 = require("../../../audit/audit.service");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const company_tax_details_schema_1 = require("../schema/company-tax-details.schema");
const company_settings_service_1 = require("../../../../company-settings/company-settings.service");
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../../../common/cache/cache.service");
let CompanyTaxService = CompanyTaxService_1 = class CompanyTaxService {
    constructor(db, audit, companySettings, logger, cache) {
        this.db = db;
        this.audit = audit;
        this.companySettings = companySettings;
        this.logger = logger;
        this.cache = cache;
        this.table = company_tax_details_schema_1.companyTaxDetails;
        this.logger.setContext(CompanyTaxService_1.name);
    }
    oneKey(companyId) {
        return `company:tax:${companyId}`;
    }
    async burst(companyId) {
        await this.cache.del(this.oneKey(companyId));
        this.logger.debug({ companyId }, 'companyTax:cache:burst');
    }
    async create(dto, user) {
        this.logger.info({ companyId: user.companyId }, 'companyTax:create:start');
        const existing = await this.db
            .select()
            .from(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.companyId, user.companyId))
            .execute();
        if (existing.length > 0) {
            this.logger.warn({ companyId: user.companyId }, 'companyTax:create:exists');
            throw new common_1.BadRequestException('Company already has tax details');
        }
        const [created] = await this.db
            .insert(this.table)
            .values({
            companyId: user.companyId,
            tin: dto.tin,
            vatNumber: dto.vatNumber,
            nhfCode: dto.nhfCode,
            pensionCode: dto.pensionCode,
        })
            .returning()
            .execute();
        await this.audit.logAction({
            action: 'create',
            entity: 'companyTax',
            entityId: created.id,
            userId: user.id,
            changes: {
                tin: dto.tin,
                vatNumber: dto.vatNumber,
                nhfCode: dto.nhfCode,
                pensionCode: dto.pensionCode,
            },
        });
        await this.burst(user.companyId);
        this.logger.info({ id: created.id }, 'companyTax:create:done');
        return created;
    }
    async findOne(companyId) {
        const key = this.oneKey(companyId);
        this.logger.debug({ companyId, key }, 'companyTax:findOne:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const [taxDetails] = await this.db
                .select()
                .from(this.table)
                .where((0, drizzle_orm_1.eq)(this.table.companyId, companyId))
                .execute();
            if (!taxDetails) {
                this.logger.warn({ companyId }, 'companyTax:findOne:not-found');
                throw new common_1.NotFoundException('Company tax details not found');
            }
            this.logger.debug({ companyId }, 'companyTax:findOne:db:done');
            return taxDetails;
        });
    }
    async update(updateCompanyTaxDto, user) {
        this.logger.info({ companyId: user.companyId, userId: user.id }, 'companyTax:update:start');
        const previous = await this.findOne(user.companyId);
        const [updated] = await this.db
            .update(this.table)
            .set({
            tin: updateCompanyTaxDto.tin,
            vatNumber: updateCompanyTaxDto.vatNumber,
            nhfCode: updateCompanyTaxDto.nhfCode,
            pensionCode: updateCompanyTaxDto.pensionCode,
        })
            .where((0, drizzle_orm_1.eq)(this.table.companyId, user.companyId))
            .returning()
            .execute();
        if (updated) {
            const isComplete = Boolean(updated.tin) &&
                Boolean(updated.vatNumber) &&
                Boolean(updated.pensionCode) &&
                Boolean(updated.nhfCode);
            if (isComplete) {
                await this.companySettings.setSetting(user.companyId, 'onboarding_tax_details', true);
            }
        }
        await this.audit.logAction({
            action: 'update',
            entity: 'companyTax',
            entityId: previous.id,
            userId: user.id,
            changes: {
                before: {
                    tin: previous.tin,
                    vatNumber: previous.vatNumber,
                    nhfCode: previous.nhfCode,
                    pensionCode: previous.pensionCode,
                },
                after: {
                    tin: updated.tin,
                    vatNumber: updated.vatNumber,
                    nhfCode: updated.nhfCode,
                    pensionCode: updated.pensionCode,
                },
            },
        });
        await this.burst(user.companyId);
        this.logger.info({ id: updated.id }, 'companyTax:update:done');
        return updated;
    }
};
exports.CompanyTaxService = CompanyTaxService;
exports.CompanyTaxService = CompanyTaxService = CompanyTaxService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        company_settings_service_1.CompanySettingsService,
        nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], CompanyTaxService);
//# sourceMappingURL=company-tax.service.js.map