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
exports.PayslipService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const cache_service_1 = require("../../../common/cache/cache.service");
const aws_service_1 = require("../../../common/aws/aws.service");
const payslip_schema_1 = require("../schema/payslip.schema");
const payroll_run_schema_1 = require("../schema/payroll-run.schema");
const schema_1 = require("../../../drizzle/schema");
const pusher_service_1 = require("../../notification/services/pusher.service");
const payroll_ytd_schema_1 = require("../schema/payroll-ytd.schema");
let PayslipService = class PayslipService {
    constructor(db, cache, aws, payrollQueue, pusher) {
        this.db = db;
        this.cache = cache;
        this.aws = aws;
        this.payrollQueue = payrollQueue;
        this.pusher = pusher;
        this.getCompany = async (company_id) => {
            const cacheKey = `company_id_${company_id}`;
            return this.cache.getOrSetCache(cacheKey, async () => {
                const company = await this.db
                    .select()
                    .from(schema_1.companies)
                    .where((0, drizzle_orm_1.eq)(schema_1.companies.id, company_id))
                    .execute();
                if (!company)
                    throw new common_1.BadRequestException('Company not found');
                return company[0].id;
            });
        };
    }
    async createPayslip(employee_id, payrollMonth) {
        const existingPayslip = await this.db
            .select()
            .from(payslip_schema_1.paySlips)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payslip_schema_1.paySlips.employeeId, employee_id), (0, drizzle_orm_1.eq)(payslip_schema_1.paySlips.payrollMonth, payrollMonth)))
            .execute();
        if (existingPayslip.length) {
            throw new Error('Payslip already exists for this month');
        }
        const payrollRecord = await this.db
            .select()
            .from(payroll_run_schema_1.payroll)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.employeeId, employee_id), (0, drizzle_orm_1.eq)(payslip_schema_1.paySlips.payrollMonth, payrollMonth)))
            .limit(1)
            .execute();
        if (!payrollRecord.length) {
            throw new Error('No payroll record found for this employee in the given month');
        }
        const payslip = await this.db
            .insert(payslip_schema_1.paySlips)
            .values({
            payrollId: payrollRecord[0].id,
            employeeId: employee_id,
            companyId: payrollRecord[0].companyId,
            payrollMonth: payrollMonth,
            issuedAt: new Date().toISOString().split('T')[0],
            employerRemarks: 'Generated automatically',
            slipStatus: 'issued',
        })
            .returning();
        return payslip;
    }
    async generatePayslipsForCompany(company_id, payrollMonth) {
        const payrollRecords = await this.db
            .select()
            .from(payroll_run_schema_1.payroll)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, company_id), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollMonth, payrollMonth)))
            .execute();
        if (!payrollRecords.length) {
            throw new common_1.BadRequestException('No payroll records found for this company in the given month');
        }
        const newPayslips = payrollRecords.map((record) => ({
            payrollId: record.id,
            employeeId: record.employeeId,
            companyId: record.companyId,
            payrollMonth: payrollMonth,
            issuedAt: new Date().toISOString().split('T')[0],
            employerRemarks: 'Auto-generated',
            slipStatus: 'issued',
        }));
        if (!newPayslips.length) {
            return { message: 'All payslips for this month already exist' };
        }
        const payslips = await this.db.insert(payslip_schema_1.paySlips).values(newPayslips);
        return payslips;
    }
    async getCompanyPayslipsById(user_id, payroll_run_id) {
        const company_id = await this.getCompany(user_id);
        const companyPayslips = this.db
            .select({
            payslip_id: payslip_schema_1.paySlips.id,
            payroll_run_id: payroll_run_schema_1.payroll.payrollRunId,
            gross_salary: payroll_run_schema_1.payroll.grossSalary,
            net_salary: payroll_run_schema_1.payroll.netSalary,
            paye_tax: payroll_run_schema_1.payroll.payeTax,
            pension_contribution: payroll_run_schema_1.payroll.pensionContribution,
            employer_pension_contribution: payroll_run_schema_1.payroll.employerPensionContribution,
            nhf_contribution: payroll_run_schema_1.payroll.nhfContribution,
            additionalDeductions: payroll_run_schema_1.payroll.customDeductions,
            payroll_month: payroll_run_schema_1.payroll.payrollMonth,
            first_name: schema_1.employees.firstName,
            last_name: schema_1.employees.lastName,
            status: payroll_run_schema_1.payroll.approvalStatus,
            payment_status: payroll_run_schema_1.payroll.paymentStatus,
            payment_date: payroll_run_schema_1.payroll.paymentDate,
            taxable_income: payroll_run_schema_1.payroll.taxableIncome,
            payslip_pdf_url: payslip_schema_1.paySlips.pdfUrl,
            salaryAdvance: payroll_run_schema_1.payroll.salaryAdvance,
        })
            .from(payslip_schema_1.paySlips)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollRunId, payroll_run_id), (0, drizzle_orm_1.eq)(schema_1.employees.companyId, company_id)))
            .innerJoin(payroll_run_schema_1.payroll, (0, drizzle_orm_1.eq)(payslip_schema_1.paySlips.payrollId, payroll_run_schema_1.payroll.id))
            .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.employeeId, schema_1.employees.id))
            .execute();
        return companyPayslips;
    }
    async getEmployeePayslipSummary(employee_id) {
        const paystubs = await this.db
            .select({
            payslip_id: payslip_schema_1.paySlips.id,
            payroll_date: payroll_run_schema_1.payroll.payrollMonth,
            gross_salary: payroll_run_schema_1.payroll.grossSalary,
            net_salary: payroll_run_schema_1.payroll.netSalary,
            totalDeduction: payroll_run_schema_1.payroll.totalDeductions,
            taxableIncome: payroll_run_schema_1.payroll.taxableIncome,
            paye: payroll_run_schema_1.payroll.payeTax,
            pensionContribution: payroll_run_schema_1.payroll.pensionContribution,
            nhfContribution: payroll_run_schema_1.payroll.nhfContribution,
            salaryAdvance: payroll_run_schema_1.payroll.salaryAdvance,
            payslip_pdf_url: payslip_schema_1.paySlips.pdfUrl,
            paymentStatus: payroll_run_schema_1.payroll.paymentStatus,
            basic: payroll_run_schema_1.payroll.basic,
            housing: payroll_run_schema_1.payroll.housing,
            transport: payroll_run_schema_1.payroll.transport,
            voluntaryDeductions: payroll_run_schema_1.payroll.voluntaryDeductions,
        })
            .from(payslip_schema_1.paySlips)
            .innerJoin(payroll_run_schema_1.payroll, (0, drizzle_orm_1.eq)(payslip_schema_1.paySlips.payrollId, payroll_run_schema_1.payroll.id))
            .where((0, drizzle_orm_1.eq)(payslip_schema_1.paySlips.employeeId, employee_id))
            .orderBy((0, drizzle_orm_1.asc)(payslip_schema_1.paySlips.issuedAt))
            .limit(4)
            .execute();
        return paystubs;
    }
    async getEmployeePayslip(payslip_id) {
        const currentYear = new Date().getFullYear();
        const result = await this.db
            .select({
            id: payslip_schema_1.paySlips.id,
            issued_at: payslip_schema_1.paySlips.issuedAt,
            status: payslip_schema_1.paySlips.slipStatus,
            employer_remarks: payslip_schema_1.paySlips.employerRemarks,
            gross_salary: payroll_run_schema_1.payroll.grossSalary,
            net_salary: payroll_run_schema_1.payroll.netSalary,
            basic: payroll_run_schema_1.payroll.basic,
            housing: payroll_run_schema_1.payroll.housing,
            transport: payroll_run_schema_1.payroll.transport,
            paye_tax: payroll_run_schema_1.payroll.payeTax,
            pdf_url: payslip_schema_1.paySlips.pdfUrl,
            salaryAdvance: payroll_run_schema_1.payroll.salaryAdvance,
            pension_contribution: payroll_run_schema_1.payroll.pensionContribution,
            nhf_contribution: payroll_run_schema_1.payroll.nhfContribution,
            payroll_month: payroll_run_schema_1.payroll.payrollMonth,
            first_name: schema_1.employees.firstName,
            last_name: schema_1.employees.lastName,
            email: schema_1.employees.email,
            employeeId: schema_1.employees.id,
            company_name: schema_1.companies.name,
            companyLogo: schema_1.companies.logo_url,
            company_email: schema_1.companies.primaryContactEmail,
            payment_date: payroll_run_schema_1.payroll.paymentDate,
            reimbursement: payroll_run_schema_1.payroll.reimbursements,
        })
            .from(payslip_schema_1.paySlips)
            .innerJoin(payroll_run_schema_1.payroll, (0, drizzle_orm_1.eq)(payslip_schema_1.paySlips.payrollId, payroll_run_schema_1.payroll.id))
            .innerJoin(payroll_ytd_schema_1.payrollYtd, (0, drizzle_orm_1.eq)(payslip_schema_1.paySlips.payrollId, payroll_ytd_schema_1.payrollYtd.payrollId))
            .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.employeeId, schema_1.employees.id))
            .innerJoin(schema_1.companies, (0, drizzle_orm_1.eq)(schema_1.employees.companyId, schema_1.companies.id))
            .where((0, drizzle_orm_1.eq)(payslip_schema_1.paySlips.id, payslip_id))
            .execute();
        const ytdTotals = await this.db
            .select({
            ytdPension: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.pension})`.as('ytdPension'),
            ytdNhf: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.nhf})`.as('ytdNhf'),
            ytdPaye: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.PAYE})`.as('ytdPaye'),
            ytdGross: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.grossSalary})`.as('ytdGross'),
            ytdNet: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.netSalary})`.as('ytdNet'),
            ytdBasic: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.basic})`.as('ytdBasic'),
            ytdHousing: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.housing})`.as('ytdHousing'),
            ytdTransport: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.transport})`.as('ytdTransport'),
        })
            .from(payroll_ytd_schema_1.payrollYtd)
            .innerJoin(payroll_run_schema_1.payroll, (0, drizzle_orm_1.eq)(payroll_ytd_schema_1.payrollYtd.payrollId, payroll_run_schema_1.payroll.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_ytd_schema_1.payrollYtd.employeeId, result[0].employeeId), (0, drizzle_orm_1.like)(payroll_run_schema_1.payroll.payrollMonth, `${currentYear}-%`)))
            .execute();
        return {
            ...result[0],
            ...ytdTotals[0],
        };
    }
};
exports.PayslipService = PayslipService;
exports.PayslipService = PayslipService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __param(3, (0, bullmq_1.InjectQueue)('payrollQueue')),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        aws_service_1.AwsService,
        bullmq_2.Queue,
        pusher_service_1.PusherService])
], PayslipService);
//# sourceMappingURL=payslip.service.js.map