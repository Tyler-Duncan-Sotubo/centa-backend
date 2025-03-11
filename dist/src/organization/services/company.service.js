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
exports.CompanyService = void 0;
const common_1 = require("@nestjs/common");
const company_schema_1 = require("../../drizzle/schema/company.schema");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const cache_service_1 = require("../../config/cache/cache.service");
const date_fns_1 = require("date-fns");
const aws_service_1 = require("../../config/aws/aws.service");
const onboarding_service_1 = require("./onboarding.service");
let CompanyService = class CompanyService {
    constructor(db, cache, awsService, onboardingService) {
        this.db = db;
        this.cache = cache;
        this.awsService = awsService;
        this.onboardingService = onboardingService;
        this.generatePaySchedule = (startDate, frequency, numPeriods = 6) => {
            const schedule = [];
            for (let i = 0; i < numPeriods; i++) {
                let payDate;
                switch (frequency) {
                    case 'weekly':
                        payDate = (0, date_fns_1.addDays)(startDate, i * 7);
                        break;
                    case 'biweekly':
                        payDate = (0, date_fns_1.addDays)(startDate, i * 14);
                        break;
                    case 'semi-monthly':
                        const firstHalf = (0, date_fns_1.startOfMonth)((0, date_fns_1.addMonths)(startDate, i));
                        const secondHalf = (0, date_fns_1.addDays)(firstHalf, 14);
                        schedule.push(firstHalf, secondHalf);
                        continue;
                    case 'monthly':
                        payDate = (0, date_fns_1.endOfMonth)((0, date_fns_1.addMonths)(startDate, i));
                        break;
                    default:
                        throw new Error('Invalid frequency');
                }
                schedule.push(payDate);
            }
            return schedule;
        };
    }
    async getCompanyByUserId(company_id) {
        const result = await this.db
            .select()
            .from(company_schema_1.companies)
            .where((0, drizzle_orm_1.eq)(company_schema_1.companies.id, company_id))
            .execute();
        if (result.length === 0) {
            throw new common_1.NotFoundException('Company not found');
        }
        return result[0];
    }
    async createCompany(dto, company_id) {
        const companyExists = await this.db
            .select({
            id: company_schema_1.companies.id,
        })
            .from(company_schema_1.companies)
            .where((0, drizzle_orm_1.eq)(company_schema_1.companies.id, company_id))
            .execute();
        if (companyExists.length > 0) {
            throw new common_1.BadRequestException('Company already exists');
        }
        const company = await this.db
            .insert(company_schema_1.companies)
            .values({
            ...dto,
        })
            .returning()
            .execute();
        return company;
    }
    async updateCompany(dto, company_id) {
        const company = await this.getCompanyByUserId(company_id);
        const logoUrl = dto.logo_url
            ? await this.awsService.uploadImageToS3(company.email, 'logo', dto.logo_url)
            : undefined;
        try {
            await this.db
                .update(company_schema_1.companies)
                .set({
                ...dto,
                logo_url: logoUrl,
            })
                .where((0, drizzle_orm_1.eq)(company_schema_1.companies.id, company_id))
                .returning()
                .execute();
            await this.onboardingService.completeTask(company_id, 'completeYourCompanyProfile');
            await this.cache.del(`companies:${company_id}`);
            return 'Company updated successfully';
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async deleteCompany(company_id) {
        try {
            await this.db
                .delete(company_schema_1.companies)
                .where((0, drizzle_orm_1.eq)(company_schema_1.companies.id, company_id))
                .execute();
            await this.cache.del(`companies:${company_id}`);
            return { message: 'Company deleted successfully' };
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async addContactToCompany(dto, company_id) {
        const contact = await this.db
            .insert(company_schema_1.company_contact)
            .values({
            ...dto,
            company_id,
        })
            .returning()
            .execute();
        await this.cache.del(`companies-contact:${company_id}`);
        return contact;
    }
    async getContactInCompany(company_id) {
        const cacheKey = `companies-contact:${company_id}`;
        return this.cache.getOrSetCache(cacheKey, async () => {
            const contact = await this.db
                .select()
                .from(company_schema_1.company_contact)
                .where((0, drizzle_orm_1.eq)(company_schema_1.company_contact.company_id, company_id))
                .execute();
            return contact;
        });
    }
    async updateContactInCompany(dto, company_id) {
        try {
            await this.db
                .update(company_schema_1.company_contact)
                .set({
                ...dto,
            })
                .where((0, drizzle_orm_1.eq)(company_schema_1.company_contact.company_id, company_id))
                .returning()
                .execute();
            await this.cache.del(`companies-contact:${company_id}`);
            return 'Contact updated successfully';
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async getPayFrequency(company_id) {
        const payFrequency = await this.db
            .select({
            id: company_schema_1.companies.id,
            pay_frequency: company_schema_1.companies.pay_frequency,
        })
            .from(company_schema_1.companies)
            .where((0, drizzle_orm_1.eq)(company_schema_1.companies.id, company_id))
            .execute();
        return payFrequency;
    }
    async updatePayFrequency(company_id, dto) {
        const schedule = this.generatePaySchedule(new Date(dto.startDate), dto.pay_frequency);
        try {
            await this.db
                .update(company_schema_1.companies)
                .set({
                pay_frequency: dto.pay_frequency,
                pay_schedule: schedule,
            })
                .where((0, drizzle_orm_1.eq)(company_schema_1.companies.id, company_id))
                .returning()
                .execute();
            await this.cache.del(`companies:${company_id}`);
            await this.onboardingService.completeTask(company_id, 'payrollScheduleUpdated');
            return 'Pay frequency updated successfully';
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async createCompanyTaxDetails(user_id, dto) {
        const company = await this.getCompanyByUserId(user_id);
        const taxDetails = await this.db
            .insert(company_schema_1.company_tax_details)
            .values({
            ...dto,
            company_id: company.id,
        })
            .returning()
            .execute();
        await this.onboardingService.completeTask(company.id, 'taxNumbersAdded');
        return taxDetails;
    }
    async getCompanyTaxDetails(user_id) {
        const company = await this.getCompanyByUserId(user_id);
        const taxDetails = await this.db
            .select()
            .from(company_schema_1.company_tax_details)
            .where((0, drizzle_orm_1.eq)(company_schema_1.company_tax_details.company_id, company.id))
            .execute();
        return taxDetails[0];
    }
    async updateCompanyTaxDetails(user_id, dto) {
        const company = await this.getCompanyByUserId(user_id);
        try {
            await this.db
                .update(company_schema_1.company_tax_details)
                .set({
                tin: dto.tin,
                vat_number: dto.vat_number,
                nhf_code: dto.nhf_code,
                pension_code: dto.pension_code,
            })
                .where((0, drizzle_orm_1.eq)(company_schema_1.company_tax_details.company_id, company.id))
                .returning()
                .execute();
            return 'Company tax details updated successfully';
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
};
exports.CompanyService = CompanyService;
exports.CompanyService = CompanyService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        aws_service_1.AwsService,
        onboarding_service_1.OnboardingService])
], CompanyService);
//# sourceMappingURL=company.service.js.map