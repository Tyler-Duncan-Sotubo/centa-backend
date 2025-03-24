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
exports.DeductionService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const deductions_schema_1 = require("../../drizzle/schema/deductions.schema");
const company_schema_1 = require("../../drizzle/schema/company.schema");
const employee_schema_1 = require("../../drizzle/schema/employee.schema");
const cache_service_1 = require("../../config/cache/cache.service");
const onboarding_service_1 = require("../../organization/services/onboarding.service");
let DeductionService = class DeductionService {
    constructor(db, cache, onboardingService) {
        this.db = db;
        this.cache = cache;
        this.onboardingService = onboardingService;
        this.getCompany = async (company_id) => {
            const cacheKey = `company_id:${company_id}`;
            return this.cache.getOrSetCache(cacheKey, async () => {
                const company = await this.db
                    .select()
                    .from(company_schema_1.companies)
                    .where((0, drizzle_orm_1.eq)(company_schema_1.companies.id, company_id))
                    .execute();
                if (!company)
                    throw new common_1.BadRequestException('Company not found');
                return company[0].id;
            });
        };
    }
    async updateTaxConfiguration(company_id, dto) {
        const companyId = await this.getCompany(company_id);
        await this.onboardingService.completeTask(companyId, 'updatePayrollSettings');
        return await this.db
            .update(deductions_schema_1.taxConfig)
            .set({
            apply_nhf: dto.apply_nhf,
            apply_paye: dto.apply_paye,
            apply_pension: dto.apply_pension,
            company_id: companyId,
        })
            .where((0, drizzle_orm_1.eq)(deductions_schema_1.taxConfig.company_id, companyId))
            .execute();
    }
    async createCustomDeduction(user_id, dto) {
        const company_id = await this.getCompany(user_id);
        return await this.db
            .insert(deductions_schema_1.customDeductions)
            .values({
            company_id: company_id,
            deduction_name: dto.deduction_name,
            amount: dto.amount,
            employee_id: dto.employee_id,
        })
            .execute();
    }
    async fetchCustomDeduction(user_id) {
        const company_id = await this.getCompany(user_id);
        const result = await this.db
            .select({
            id: deductions_schema_1.customDeductions.id,
            deduction_name: deductions_schema_1.customDeductions.deduction_name,
            amount: deductions_schema_1.customDeductions.amount,
            first_name: employee_schema_1.employees.first_name,
            last_name: employee_schema_1.employees.last_name,
            employee_id: deductions_schema_1.customDeductions.employee_id,
        })
            .from(deductions_schema_1.customDeductions)
            .leftJoin(employee_schema_1.employees, (0, drizzle_orm_1.eq)(deductions_schema_1.customDeductions.employee_id, employee_schema_1.employees.id))
            .where((0, drizzle_orm_1.eq)(deductions_schema_1.customDeductions.company_id, company_id))
            .execute();
        return result;
    }
    async updateCustomDeduction(user_id, dto, id) {
        const company_id = await this.getCompany(user_id);
        return await this.db
            .update(deductions_schema_1.customDeductions)
            .set({
            company_id: company_id,
            deduction_name: dto.deduction_name,
            amount: dto.amount,
        })
            .where((0, drizzle_orm_1.eq)(deductions_schema_1.customDeductions.id, id))
            .execute();
    }
    async deleteCustomDeduction(id) {
        return await this.db
            .delete(deductions_schema_1.customDeductions)
            .where((0, drizzle_orm_1.eq)(deductions_schema_1.customDeductions.id, id))
            .execute();
    }
};
exports.DeductionService = DeductionService;
exports.DeductionService = DeductionService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        onboarding_service_1.OnboardingService])
], DeductionService);
//# sourceMappingURL=deduction.service.js.map