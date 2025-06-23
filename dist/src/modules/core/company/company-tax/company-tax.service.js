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
exports.CompanyTaxService = void 0;
const common_1 = require("@nestjs/common");
const audit_service_1 = require("../../../audit/audit.service");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const company_tax_details_schema_1 = require("../schema/company-tax-details.schema");
const company_settings_service_1 = require("../../../../company-settings/company-settings.service");
let CompanyTaxService = class CompanyTaxService {
    constructor(db, audit, companySettings) {
        this.db = db;
        this.audit = audit;
        this.companySettings = companySettings;
        this.table = company_tax_details_schema_1.companyTaxDetails;
    }
    async create(dto, user) {
        const { tin, vatNumber, nhfCode, pensionCode } = dto;
        const existingTaxDetails = await this.db
            .select()
            .from(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.companyId, user.companyId))
            .execute();
        if (existingTaxDetails.length > 0) {
            throw new common_1.BadRequestException('Company already has tax details');
        }
        const result = await this.db
            .insert(this.table)
            .values({
            companyId: user.companyId,
            tin,
            vatNumber,
            nhfCode,
            pensionCode,
        })
            .returning()
            .execute();
        await this.audit.logAction({
            action: 'create',
            entity: 'companyTax',
            entityId: result[0].id,
            userId: user.id,
            changes: {
                tin,
                vatNumber,
                nhfCode,
                pensionCode,
            },
        });
    }
    async findOne(companyId) {
        const [taxDetails] = await this.db
            .select()
            .from(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.companyId, companyId))
            .execute();
        if (!taxDetails) {
            throw new common_1.NotFoundException('Company tax details not found');
        }
        return taxDetails;
    }
    async update(updateCompanyTaxDto, user) {
        const taxDetails = await this.findOne(user.companyId);
        const { tin, vatNumber, nhfCode, pensionCode } = updateCompanyTaxDto;
        const result = await this.db
            .update(this.table)
            .set({
            tin,
            vatNumber,
            nhfCode,
            pensionCode,
        })
            .where((0, drizzle_orm_1.eq)(this.table.companyId, user.companyId))
            .returning()
            .execute();
        if (result.length > 0) {
            const taxDetails = result[0];
            const isComplete = taxDetails.tin &&
                taxDetails.vatNumber &&
                taxDetails.pensionCode &&
                taxDetails.nhfCode;
            if (isComplete) {
                await this.companySettings.setSetting(user.companyId, 'onboarding_tax_details', true);
            }
        }
        await this.audit.logAction({
            action: 'update',
            entity: 'companyTax',
            entityId: taxDetails.id,
            userId: user.id,
            changes: {
                before: {
                    tin: result[0].tin,
                    vatNumber: result[0].vatNumber,
                    nhfCode: result[0].nhfCode,
                    pensionCode: result[0].pensionCode,
                },
                after: { tin, vatNumber, nhfCode, pensionCode },
            },
        });
        return result[0];
    }
};
exports.CompanyTaxService = CompanyTaxService;
exports.CompanyTaxService = CompanyTaxService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        company_settings_service_1.CompanySettingsService])
], CompanyTaxService);
//# sourceMappingURL=company-tax.service.js.map