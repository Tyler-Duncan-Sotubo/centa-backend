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
const axios_1 = require("axios");
const employee_schema_1 = require("../../drizzle/schema/employee.schema");
const payroll_schema_1 = require("../../drizzle/schema/payroll.schema");
let CompanyService = class CompanyService {
    constructor(db, cache, awsService, onboardingService) {
        this.db = db;
        this.cache = cache;
        this.awsService = awsService;
        this.onboardingService = onboardingService;
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
            await this.onboardingService.completeTask(company_id, 'setupCompanyProfile');
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
        await this.onboardingService.completeTask(company.id, 'addTaxInformation');
        return taxDetails;
    }
    async getCompanyTaxDetails(user_id) {
        const company = await this.getCompanyByUserId(user_id);
        const taxDetails = await this.db
            .select()
            .from(company_schema_1.company_tax_details)
            .where((0, drizzle_orm_1.eq)(company_schema_1.company_tax_details.company_id, company.id))
            .execute();
        return taxDetails[0] || {};
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
    async getPayFrequency(company_id) {
        const payFrequency = await this.db
            .select()
            .from(company_schema_1.paySchedules)
            .where((0, drizzle_orm_1.eq)(company_schema_1.paySchedules.companyId, company_id))
            .execute();
        return payFrequency;
    }
    async getNextPayDate(company_id) {
        const paySchedulesData = await this.db
            .select({
            paySchedule: company_schema_1.paySchedules.paySchedule,
        })
            .from(company_schema_1.paySchedules)
            .where((0, drizzle_orm_1.eq)(company_schema_1.paySchedules.companyId, company_id))
            .execute();
        const today = new Date();
        const allPayDates = paySchedulesData
            .flatMap((schedule) => schedule.paySchedule)
            .map((date) => new Date(date))
            .filter((date) => date > today)
            .sort((a, b) => a.getTime() - b.getTime());
        return allPayDates.length > 0 ? allPayDates[0] : null;
    }
    async getPayFrequencySummary(company_id) {
        const payFrequency = await this.db
            .select({
            payFrequency: company_schema_1.paySchedules.payFrequency,
            paySchedules: company_schema_1.paySchedules.paySchedule,
            id: company_schema_1.paySchedules.id,
        })
            .from(company_schema_1.paySchedules)
            .where((0, drizzle_orm_1.eq)(company_schema_1.paySchedules.companyId, company_id))
            .execute();
        return payFrequency;
    }
    async isPublicHoliday(date, countryCode) {
        const formattedDate = date.toISOString().split('T')[0];
        const url = `https://date.nager.at/api/v3/publicholidays/${date.getFullYear()}/${countryCode}`;
        try {
            const response = await axios_1.default.get(url);
            const holidays = response.data;
            return holidays.some((holiday) => holiday.date === formattedDate);
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async adjustForWeekendAndHoliday(date, countryCode) {
        let adjustedDate = date;
        if ((0, date_fns_1.isSaturday)(adjustedDate)) {
            adjustedDate = (0, date_fns_1.addDays)(adjustedDate, -1);
        }
        else if ((0, date_fns_1.isSunday)(adjustedDate)) {
            adjustedDate = (0, date_fns_1.addDays)(adjustedDate, -2);
        }
        while (await this.isPublicHoliday(adjustedDate, countryCode)) {
            adjustedDate = (0, date_fns_1.addDays)(adjustedDate, -1);
        }
        return adjustedDate;
    }
    async generatePaySchedule(startDate, frequency, numPeriods = 6, countryCode) {
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
                    schedule.push(await this.adjustForWeekendAndHoliday(firstHalf, countryCode), await this.adjustForWeekendAndHoliday(secondHalf, countryCode));
                    continue;
                case 'monthly':
                    payDate = (0, date_fns_1.endOfMonth)((0, date_fns_1.addMonths)(startDate, i));
                    break;
                default:
                    throw new Error('Invalid frequency');
            }
            schedule.push(await this.adjustForWeekendAndHoliday(payDate, countryCode));
        }
        return schedule;
    }
    async createPayFrequency(company_id, dto) {
        const schedule = await this.generatePaySchedule(new Date(dto.startDate), dto.pay_frequency, 6, dto.countryCode);
        try {
            const paySchedule = await this.db.insert(company_schema_1.paySchedules).values({
                companyId: company_id,
                payFrequency: dto.pay_frequency,
                paySchedule: schedule,
                startDate: dto.startDate,
                weekendAdjustment: dto.weekendAdjustment,
                holidayAdjustment: dto.holidayAdjustment,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            await this.cache.del(`companies:${company_id}`);
            await this.onboardingService.completeTask(company_id, 'configurePayrollSchedule');
            return paySchedule;
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async updatePayFrequency(company_id, dto, payFrequencyId) {
        const schedule = await this.generatePaySchedule(new Date(dto.startDate), dto.pay_frequency, 6, dto.countryCode);
        try {
            await this.db
                .update(company_schema_1.paySchedules)
                .set({
                payFrequency: dto.pay_frequency,
                paySchedule: schedule,
                startDate: dto.startDate,
                weekendAdjustment: dto.weekendAdjustment,
                holidayAdjustment: dto.holidayAdjustment,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(company_schema_1.paySchedules.companyId, company_id), (0, drizzle_orm_1.eq)(company_schema_1.paySchedules.id, payFrequencyId)))
                .execute();
            await this.cache.del(`companies:${company_id}`);
            await this.onboardingService.completeTask(company_id, 'configurePayrollSchedule');
            return 'Pay frequency updated successfully';
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async getDashboardPreview(company_id) {
        const company = await this.db
            .select({
            name: company_schema_1.companies.name,
        })
            .from(company_schema_1.companies)
            .where((0, drizzle_orm_1.eq)(company_schema_1.companies.id, company_id));
        const nextPayDate = await this.getNextPayDate(company_id);
        const allEmployees = await this.db
            .select({
            employment_status: employee_schema_1.employees.employment_status,
            annual_gross: employee_schema_1.employees.annual_gross,
        })
            .from(employee_schema_1.employees)
            .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.company_id, company_id));
        const bonuses = await this.db
            .select({
            id: payroll_schema_1.bonus.id,
            amount: payroll_schema_1.bonus.amount,
        })
            .from(payroll_schema_1.bonus)
            .where((0, drizzle_orm_1.eq)(payroll_schema_1.bonus.company_id, company_id))
            .execute();
        const totalBonus = bonuses.reduce((acc, bonus) => acc + bonus.amount, 0);
        return {
            company: company[0] || {},
            nextPayDate: nextPayDate || '',
            employees: allEmployees || [],
            bonus: totalBonus || [],
        };
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