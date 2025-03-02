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
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const payroll_schema_1 = require("../../drizzle/schema/payroll.schema");
const employee_schema_1 = require("../../drizzle/schema/employee.schema");
const json_2_csv_1 = require("json-2-csv");
const fs = require("fs");
const path = require("path");
const cache_service_1 = require("../../config/cache/cache.service");
const aws_service_1 = require("../../config/aws/aws.service");
const company_schema_1 = require("../../drizzle/schema/company.schema");
const pusher_service_1 = require("../../notification/services/pusher.service");
let PayslipService = class PayslipService {
    constructor(db, cache, aws, pusher) {
        this.db = db;
        this.cache = cache;
        this.aws = aws;
        this.pusher = pusher;
        this.getCompany = async (company_id) => {
            const cacheKey = `company_id_${company_id}`;
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
    async createPayslip(employee_id, payrollMonth) {
        const existingPayslip = await this.db
            .select()
            .from(payroll_schema_1.payslips)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_schema_1.payslips.employee_id, employee_id), (0, drizzle_orm_1.eq)(payroll_schema_1.payslips.payroll_month, payrollMonth)))
            .execute();
        if (existingPayslip.length) {
            throw new Error('Payslip already exists for this month');
        }
        const payrollRecord = await this.db
            .select()
            .from(payroll_schema_1.payroll)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_schema_1.payroll.employee_id, employee_id), (0, drizzle_orm_1.eq)(payroll_schema_1.payslips.payroll_month, payrollMonth)))
            .limit(1)
            .execute();
        if (!payrollRecord.length) {
            throw new Error('No payroll record found for this employee in the given month');
        }
        const payslip = await this.db
            .insert(payroll_schema_1.payslips)
            .values({
            payroll_id: payrollRecord[0].id,
            employee_id,
            company_id: payrollRecord[0].company_id,
            payroll_month: payrollMonth,
            issued_at: new Date().toISOString().split('T')[0],
            employer_remarks: 'Generated automatically',
            slip_status: 'issued',
        })
            .returning();
        return payslip;
    }
    async generatePayslipsForCompany(company_id, payrollMonth) {
        const payrollRecords = await this.db
            .select()
            .from(payroll_schema_1.payroll)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_schema_1.payroll.company_id, company_id), (0, drizzle_orm_1.eq)(payroll_schema_1.payroll.payroll_month, payrollMonth)))
            .execute();
        if (!payrollRecords.length) {
            throw new common_1.BadRequestException('No payroll records found for this company in the given month');
        }
        const existingPayslips = await this.db
            .select({ payrollId: payroll_schema_1.payslips.payroll_id })
            .from(payroll_schema_1.payslips)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_schema_1.payslips.company_id, company_id), (0, drizzle_orm_1.eq)(payroll_schema_1.payslips.payroll_month, payrollMonth)))
            .execute();
        const existingPayslipIds = new Set(existingPayslips.map((p) => p.payrollId));
        const newPayslips = payrollRecords
            .filter((record) => !existingPayslipIds.has(record.id))
            .map((record) => ({
            payroll_id: record.id,
            employee_id: record.employee_id,
            company_id: record.company_id,
            payroll_month: payrollMonth,
            issued_at: new Date().toISOString().split('T')[0],
            employer_remarks: 'Auto-generated',
            slip_status: 'issued',
        }));
        if (!newPayslips.length) {
            return { message: 'All payslips for this month already exist' };
        }
        await this.db.insert(payroll_schema_1.payslips).values(newPayslips);
        await this.pusher.createNotification(newPayslips[0].company_id, `New payslips generated for ${payrollMonth}`, 'payroll');
        return { message: `${newPayslips.length} payslips generated successfully` };
    }
    async getCompanyPayslipsById(user_id, payroll_run_id) {
        const company_id = await this.getCompany(user_id);
        const companyPayslips = this.db
            .select({
            payslip_id: payroll_schema_1.payslips.id,
            payroll_run_id: payroll_schema_1.payroll.payroll_run_id,
            gross_salary: payroll_schema_1.payroll.gross_salary,
            net_salary: payroll_schema_1.payroll.net_salary,
            paye_tax: payroll_schema_1.payroll.paye_tax,
            pension_contribution: payroll_schema_1.payroll.pension_contribution,
            employer_pension_contribution: payroll_schema_1.payroll.employer_pension_contribution,
            nhf_contribution: payroll_schema_1.payroll.nhf_contribution,
            additionalDeductions: payroll_schema_1.payroll.custom_deductions,
            payroll_month: payroll_schema_1.payroll.payroll_month,
            first_name: employee_schema_1.employees.first_name,
            last_name: employee_schema_1.employees.last_name,
            status: payroll_schema_1.payroll.approval_status,
            payment_status: payroll_schema_1.payroll.payment_status,
            payment_date: payroll_schema_1.payroll.payment_date,
            taxable_income: payroll_schema_1.payroll.taxable_income,
            payslip_pdf_url: payroll_schema_1.payslips.pdf_url,
            salaryAdvance: payroll_schema_1.payroll.salary_advance,
        })
            .from(payroll_schema_1.payslips)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_schema_1.payroll.payroll_run_id, payroll_run_id), (0, drizzle_orm_1.eq)(employee_schema_1.employees.company_id, company_id)))
            .innerJoin(payroll_schema_1.payroll, (0, drizzle_orm_1.eq)(payroll_schema_1.payslips.payroll_id, payroll_schema_1.payroll.id))
            .innerJoin(employee_schema_1.employees, (0, drizzle_orm_1.eq)(payroll_schema_1.payroll.employee_id, employee_schema_1.employees.id))
            .execute();
        return companyPayslips;
    }
    async DownloadCompanyPayslipsByMonth(user_id, payroll_run_id, format = 'internal') {
        const company_id = await this.getCompany(user_id);
        const companyPayslips = await this.db
            .select({
            employee_number: employee_schema_1.employees.employee_number,
            first_name: employee_schema_1.employees.first_name,
            last_name: employee_schema_1.employees.last_name,
            email: employee_schema_1.employees.email,
            issued_at: payroll_schema_1.payslips.issued_at,
            employer_remarks: payroll_schema_1.payslips.employer_remarks,
            gross_salary: payroll_schema_1.payroll.gross_salary,
            net_salary: payroll_schema_1.payroll.net_salary,
            paye_tax: payroll_schema_1.payroll.paye_tax,
            pension_contribution: payroll_schema_1.payroll.pension_contribution,
            employer_pension_contribution: payroll_schema_1.payroll.employer_pension_contribution,
            nhf_contribution: payroll_schema_1.payroll.nhf_contribution,
            payroll_month: payroll_schema_1.payroll.payroll_month,
            bank_name: employee_schema_1.employee_bank_details.bank_name,
            bank_account_number: employee_schema_1.employee_bank_details.bank_account_number,
            payroll_id: payroll_schema_1.payroll.id,
        })
            .from(payroll_schema_1.payslips)
            .innerJoin(payroll_schema_1.payroll, (0, drizzle_orm_1.eq)(payroll_schema_1.payslips.payroll_id, payroll_schema_1.payroll.id))
            .innerJoin(employee_schema_1.employees, (0, drizzle_orm_1.eq)(payroll_schema_1.payroll.employee_id, employee_schema_1.employees.id))
            .leftJoin(employee_schema_1.employee_bank_details, (0, drizzle_orm_1.eq)(employee_schema_1.employees.id, employee_schema_1.employee_bank_details.employee_id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_schema_1.payroll.payroll_run_id, payroll_run_id), (0, drizzle_orm_1.eq)(employee_schema_1.employees.company_id, company_id)))
            .orderBy((0, drizzle_orm_1.asc)(employee_schema_1.employees.employee_number))
            .execute();
        if (!companyPayslips || companyPayslips.length === 0) {
            return null;
        }
        const csvFields = format === 'bank'
            ? [
                { field: 'employee_number', title: 'Employee Number' },
                { field: 'first_name', title: 'First Name' },
                { field: 'last_name', title: 'Last Name' },
                { field: 'bank_name', title: 'Bank Name' },
                { field: 'bank_account_number', title: 'Bank Account Number' },
                { field: 'net_salary', title: 'Net Salary' },
            ]
            : [
                { field: 'employee_number', title: 'Employee Number' },
                { field: 'first_name', title: 'First Name' },
                { field: 'last_name', title: 'Last Name' },
                { field: 'email', title: 'Email' },
                { field: 'gross_salary', title: 'Gross Salary' },
                { field: 'net_salary', title: 'Net Salary' },
                { field: 'paye_tax', title: 'PAYE Tax' },
                { field: 'pension_contribution', title: 'Pension Contribution' },
                {
                    field: 'employer_pension_contribution',
                    title: 'Employer Pension Contribution',
                },
                { field: 'nhf_contribution', title: 'NHF Contribution' },
                { field: 'payroll_month', title: 'Payroll Month' },
                { field: 'issued_at', title: 'Issued Date' },
                { field: 'employer_remarks', title: 'Employer Remarks' },
            ];
        const csvData = (0, json_2_csv_1.json2csv)(companyPayslips, {
            prependHeader: true,
            emptyFieldValue: '',
            keys: csvFields.map((field) => {
                return { field: field.field, title: field.title };
            }),
        });
        const filePath = path.resolve(process.cwd(), 'src/downloads', `payslips-${payroll_run_id}.csv`);
        const storageDir = path.dirname(filePath);
        if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true });
        }
        fs.writeFileSync(filePath, csvData, 'utf8');
        await this.aws.uploadFile(filePath, `payslips-${payroll_run_id}-${format}.csv`, company_id, 'payroll', 'download');
        return filePath;
    }
    async getEmployeePayslipSummary(employee_id) {
        const paystubs = await this.db
            .select({
            payslip_id: payroll_schema_1.payslips.id,
            payroll_month: payroll_schema_1.payroll.payroll_month,
        })
            .from(payroll_schema_1.payslips)
            .innerJoin(payroll_schema_1.payroll, (0, drizzle_orm_1.eq)(payroll_schema_1.payslips.payroll_id, payroll_schema_1.payroll.id))
            .where((0, drizzle_orm_1.eq)(payroll_schema_1.payslips.employee_id, employee_id))
            .orderBy((0, drizzle_orm_1.asc)(payroll_schema_1.payslips.issued_at))
            .execute();
        return paystubs;
    }
    async getEmployeePayslip(payslip_id) {
        const result = await this.db
            .select({
            id: payroll_schema_1.payslips.id,
            issued_at: payroll_schema_1.payslips.issued_at,
            status: payroll_schema_1.payslips.slip_status,
            employer_remarks: payroll_schema_1.payslips.employer_remarks,
            gross_salary: payroll_schema_1.payroll.gross_salary,
            net_salary: payroll_schema_1.payroll.net_salary,
            paye_tax: payroll_schema_1.payroll.paye_tax,
            pdf_url: payroll_schema_1.payslips.pdf_url,
            salaryAdvance: payroll_schema_1.payroll.salary_advance,
            pension_contribution: payroll_schema_1.payroll.pension_contribution,
            nhf_contribution: payroll_schema_1.payroll.nhf_contribution,
            payroll_month: payroll_schema_1.payroll.payroll_month,
            first_name: employee_schema_1.employees.first_name,
            last_name: employee_schema_1.employees.last_name,
            email: employee_schema_1.employees.email,
            company_name: company_schema_1.companies.name,
            company_address: company_schema_1.companies.address,
            company_email: company_schema_1.companies.email,
            company_logo: company_schema_1.companies.logo_url,
            company_city: company_schema_1.companies.city,
        })
            .from(payroll_schema_1.payslips)
            .innerJoin(payroll_schema_1.payroll, (0, drizzle_orm_1.eq)(payroll_schema_1.payslips.payroll_id, payroll_schema_1.payroll.id))
            .innerJoin(employee_schema_1.employees, (0, drizzle_orm_1.eq)(payroll_schema_1.payroll.employee_id, employee_schema_1.employees.id))
            .innerJoin(company_schema_1.companies, (0, drizzle_orm_1.eq)(employee_schema_1.employees.company_id, company_schema_1.companies.id))
            .where((0, drizzle_orm_1.eq)(payroll_schema_1.payslips.id, payslip_id))
            .execute();
        return result[0];
    }
};
exports.PayslipService = PayslipService;
exports.PayslipService = PayslipService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        aws_service_1.AwsService,
        pusher_service_1.PusherService])
], PayslipService);
//# sourceMappingURL=payslip.service.js.map