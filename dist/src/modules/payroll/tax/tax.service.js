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
exports.TaxService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const path = require("path");
const exceljs_1 = require("exceljs");
const cache_service_1 = require("../../../common/cache/cache.service");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const payroll_run_schema_1 = require("../schema/payroll-run.schema");
const company_tax_details_schema_1 = require("../../core/company/schema/company-tax-details.schema");
const schema_1 = require("../../../drizzle/schema");
const tax_schema_1 = require("../schema/tax.schema");
const pusher_service_1 = require("../../notification/services/pusher.service");
const decimal_js_1 = require("decimal.js");
const deductions_service_1 = require("../deductions/deductions.service");
const deduction_schema_1 = require("../schema/deduction.schema");
let TaxService = class TaxService {
    constructor(db, cache, pusher, deductions) {
        this.db = db;
        this.cache = cache;
        this.pusher = pusher;
        this.deductions = deductions;
        this.getCompany = async (company_id) => {
            return this.cache.getOrSetVersioned(company_id, ['company', 'meta'], async () => {
                const company = await this.db
                    .select()
                    .from(schema_1.companies)
                    .where((0, drizzle_orm_1.eq)(schema_1.companies.id, company_id))
                    .execute();
                if (!company?.[0])
                    throw new common_1.BadRequestException('Company not found');
                return company[0].id;
            }, { tags: ['company', `company:${company_id}`] });
        };
    }
    async onPayrollApproval(company_id, payrollMonth, payrollRunId) {
        const payrollRecords = await this.db
            .selectDistinctOn([payroll_run_schema_1.payroll.employeeId], {
            payrollId: payroll_run_schema_1.payroll.id,
            companyId: payroll_run_schema_1.payroll.companyId,
            payrollMonth: payroll_run_schema_1.payroll.payrollMonth,
            employeeId: schema_1.employees.id,
            firstName: schema_1.employees.firstName,
            lastName: schema_1.employees.lastName,
            basicSalary: (0, drizzle_orm_1.sql) `payroll.gross_salary`,
            payeTax: (0, drizzle_orm_1.sql) `payroll.paye_tax`,
            pensionContribution: (0, drizzle_orm_1.sql) `payroll.pension_contribution`,
            employerPensionContribution: (0, drizzle_orm_1.sql) `payroll.employer_pension_contribution`,
            nhfContribution: (0, drizzle_orm_1.sql) `payroll.nhf_contribution`,
            employeeTin: schema_1.employeeFinancials.tin,
            employeePensionPin: schema_1.employeeFinancials.pensionPin,
            employeeNhfNumber: schema_1.employeeFinancials.nhfNumber,
            taxableAmount: (0, drizzle_orm_1.sql) `payroll.taxable_income`,
            voluntaryDeductions: payroll_run_schema_1.payroll.voluntaryDeductions,
        })
            .from(payroll_run_schema_1.payroll)
            .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.employeeId, schema_1.employees.id))
            .innerJoin(schema_1.employeeFinancials, (0, drizzle_orm_1.eq)(schema_1.employeeFinancials.employeeId, schema_1.employees.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, company_id), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollMonth, payrollMonth), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollRunId, payrollRunId), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.paymentStatus, 'paid')))
            .execute();
        if (!payrollRecords.length) {
            throw new common_1.BadRequestException('No approved payroll records found');
        }
        const [company] = await this.db
            .select({
            company_id: schema_1.companies.id,
            company_tin: company_tax_details_schema_1.companyTaxDetails.tin,
        })
            .from(schema_1.companies)
            .where((0, drizzle_orm_1.eq)(schema_1.companies.id, company_id))
            .innerJoin(company_tax_details_schema_1.companyTaxDetails, (0, drizzle_orm_1.eq)(schema_1.companies.id, company_tax_details_schema_1.companyTaxDetails.companyId))
            .execute();
        if (!company) {
            throw new common_1.BadRequestException('Company not found');
        }
        const filingMap = new Map();
        for (const record of payrollRecords) {
            const taxEntries = [
                ['PAYE', new decimal_js_1.default(record.payeTax)],
                ['Pension', new decimal_js_1.default(record.pensionContribution)],
                ['NHF', new decimal_js_1.default(record.nhfContribution)],
            ];
            for (const [taxType, amount] of taxEntries) {
                if (amount.lte(0))
                    continue;
                if (!filingMap.has(taxType)) {
                    const filingId = await this.db
                        .insert(tax_schema_1.taxFilings)
                        .values({
                        companyId: company.company_id,
                        companyTin: company.company_tin,
                        taxType,
                        payrollMonth: record.payrollMonth.toString(),
                        referenceNumber: taxType,
                        payrollId: record.payrollId,
                    })
                        .returning({ id: tax_schema_1.taxFilings.id })
                        .execute()
                        .then((res) => res[0].id);
                    filingMap.set(taxType, { filingId, details: [] });
                }
                const filing = filingMap.get(taxType);
                filing.details.push({
                    taxFilingId: filing.filingId,
                    employeeId: record.employeeId,
                    name: `${record.firstName} ${record.lastName}`,
                    basicSalary: new decimal_js_1.default(record.basicSalary).toFixed(2),
                    contributionAmount: amount.toFixed(2),
                    tin: record.employeeTin,
                    pensionPin: record.employeePensionPin,
                    nhfNumber: record.employeeNhfNumber,
                    employerContribution: new decimal_js_1.default(record.employerPensionContribution).toFixed(2),
                    taxableAmount: new decimal_js_1.default(record.taxableAmount).toFixed(2),
                });
            }
        }
        for (const { details } of filingMap.values()) {
            await this.db.insert(tax_schema_1.taxFilingDetails).values(details).execute();
        }
        await this.deductions.processVoluntaryDeductionsFromPayroll(payrollRecords, payrollRunId, company_id);
        await this.cache.bumpCompanyVersion(company_id);
        await this.cache.invalidateTags([
            'tax:filings',
            `company:${company_id}:tax_filings`,
            `company:${company_id}:voluntary_deductions`,
        ]);
        await this.pusher.createNotification(company_id, `Your tax filings have been created successfully for the month of ${payrollMonth}`, 'tax');
        return { message: 'Tax filings created successfully' };
    }
    async getCompanyTaxFilings(user_id) {
        const company_id = await this.getCompany(user_id);
        return this.cache.getOrSetVersioned(company_id, ['tax', 'filings', 'summary'], async () => {
            const statutoryFilings = await this.db
                .select({
                id: tax_schema_1.taxFilings.id,
                tax_type: tax_schema_1.taxFilings.taxType,
                total_deductions: (0, drizzle_orm_1.sql) `SUM(
              CASE 
                WHEN tax_filings.tax_type = 'Pension'
                THEN ${tax_schema_1.taxFilingDetails.contributionAmount} + ${tax_schema_1.taxFilingDetails.employerContribution}
                WHEN tax_filings.tax_type != 'Pension'
                THEN ${tax_schema_1.taxFilingDetails.contributionAmount}
                ELSE 0
              END
            )`.as('total_deductions'),
                status: tax_schema_1.taxFilings.status,
                month: tax_schema_1.taxFilings.payrollMonth,
            })
                .from(tax_schema_1.taxFilings)
                .innerJoin(tax_schema_1.taxFilingDetails, (0, drizzle_orm_1.eq)(tax_schema_1.taxFilings.id, tax_schema_1.taxFilingDetails.taxFilingId))
                .where((0, drizzle_orm_1.eq)(tax_schema_1.taxFilings.companyId, company_id))
                .groupBy(tax_schema_1.taxFilings.taxType, tax_schema_1.taxFilings.status, tax_schema_1.taxFilings.id)
                .execute();
            const voluntaryFilings = await this.db
                .select({
                id: (0, drizzle_orm_1.sql) `CONCAT('voluntary_', ${deduction_schema_1.filingVoluntaryDeductions.payrollId}, '_', ${deduction_schema_1.filingVoluntaryDeductions.deductionName})`.as('id'),
                tax_type: deduction_schema_1.filingVoluntaryDeductions.deductionName,
                total_deductions: (0, drizzle_orm_1.sql) `SUM(${deduction_schema_1.filingVoluntaryDeductions.amount})`.as('total_deductions'),
                status: deduction_schema_1.filingVoluntaryDeductions.status,
                month: deduction_schema_1.filingVoluntaryDeductions.payrollMonth,
            })
                .from(deduction_schema_1.filingVoluntaryDeductions)
                .where((0, drizzle_orm_1.eq)(deduction_schema_1.filingVoluntaryDeductions.companyId, company_id))
                .groupBy(deduction_schema_1.filingVoluntaryDeductions.deductionName, deduction_schema_1.filingVoluntaryDeductions.payrollMonth, deduction_schema_1.filingVoluntaryDeductions.payrollId, deduction_schema_1.filingVoluntaryDeductions.status)
                .execute();
            return [...statutoryFilings, ...voluntaryFilings];
        }, {
            tags: [
                'tax:filings',
                `company:${company_id}:tax_filings`,
                `company:${company_id}:voluntary_deductions`,
            ],
        });
    }
    async updateCompanyTaxFilings(tax_filing_id, status) {
        const [updated] = await this.db
            .update(tax_schema_1.taxFilings)
            .set({ status })
            .where((0, drizzle_orm_1.eq)(tax_schema_1.taxFilings.id, tax_filing_id))
            .returning({ companyId: tax_schema_1.taxFilings.companyId })
            .execute();
        if (updated?.companyId) {
            await this.cache.bumpCompanyVersion(updated.companyId);
            await this.cache.invalidateTags([
                'tax:filings',
                `company:${updated.companyId}:tax_filings`,
            ]);
        }
        return { success: true };
    }
    async generateTaxFilingExcel(tax_filing_id) {
        const taxFiling = await this.db
            .select({
            company_name: schema_1.companies.name,
            company_tin: tax_schema_1.taxFilings.companyTin,
            payroll_month: tax_schema_1.taxFilings.payrollMonth,
            tax_type: tax_schema_1.taxFilings.taxType,
        })
            .from(tax_schema_1.taxFilings)
            .innerJoin(schema_1.companies, (0, drizzle_orm_1.eq)(tax_schema_1.taxFilings.companyId, schema_1.companies.id))
            .where((0, drizzle_orm_1.eq)(tax_schema_1.taxFilings.id, tax_filing_id))
            .execute();
        if (!taxFiling.length)
            throw new Error('No tax filing data found for the given ID.');
        const filingDetails = await this.db
            .select({
            tin: tax_schema_1.taxFilingDetails.tin,
            pension_pin: tax_schema_1.taxFilingDetails.pensionPin,
            nhf_number: tax_schema_1.taxFilingDetails.nhfNumber,
            employee_id: schema_1.employees.employeeNumber,
            first_name: schema_1.employees.firstName,
            last_name: schema_1.employees.lastName,
            basic_salary: tax_schema_1.taxFilingDetails.basicSalary,
            contribution_amount: tax_schema_1.taxFilingDetails.contributionAmount,
            employer_contribution: tax_schema_1.taxFilingDetails.employerContribution,
            taxable_amount: tax_schema_1.taxFilingDetails.taxableAmount,
        })
            .from(tax_schema_1.taxFilingDetails)
            .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(tax_schema_1.taxFilingDetails.employeeId, schema_1.employees.id))
            .where((0, drizzle_orm_1.eq)(tax_schema_1.taxFilingDetails.taxFilingId, tax_filing_id))
            .execute();
        if (!filingDetails.length)
            throw new Error('No employee details found for this tax filing.');
        let templateFile = '';
        let sheetName = '';
        const taxType = taxFiling[0].tax_type;
        if (taxType === 'PAYE') {
            templateFile = 'tax_template.xlsx';
            sheetName = 'sheet';
        }
        else if (taxType === 'Pension') {
            templateFile = 'pension_template.xlsx';
            sheetName = 'Month';
        }
        else if (taxType === 'NHF') {
            templateFile = 'nhf_template.xlsx';
            sheetName = 'Month';
        }
        else {
            throw new Error("Invalid tax type. Expected 'PAYE' or 'Pension'.");
        }
        const templatePath = path.resolve(process.cwd(), 'src/templates', templateFile);
        const workbook = new exceljs_1.Workbook();
        await workbook.xlsx.readFile(templatePath);
        const worksheet = workbook.getWorksheet(sheetName);
        if (!worksheet)
            throw new Error(`Worksheet '${sheetName}' not found in ${templateFile}`);
        if (taxType === 'PAYE') {
            worksheet.getCell('B7').value = taxFiling[0].company_name;
            worksheet.getCell('B9').value = taxFiling[0].company_tin;
            worksheet.getCell('B10').value = new Date().toISOString().split('T')[0];
            worksheet.getCell('B11').value = taxFiling[0].payroll_month
                .toString()
                .split('T')[0];
            let rowIndex = 16;
            filingDetails.forEach((detail, index) => {
                const basicSalary = new decimal_js_1.default(detail.basic_salary || 0);
                const contribution = new decimal_js_1.default(detail.contribution_amount || 0);
                const taxableIncome = new decimal_js_1.default(detail.taxable_amount || 0);
                worksheet.getCell(`A${rowIndex}`).value = String(index + 1);
                worksheet.getCell(`B${rowIndex}`).value = String(detail.tin || 'N/A');
                worksheet.getCell(`C${rowIndex}`).value = String(detail.employee_id || 'N/A');
                worksheet.getCell(`E${rowIndex}`).value = detail.last_name;
                worksheet.getCell(`F${rowIndex}`).value = detail.first_name;
                worksheet.getCell(`G${rowIndex}`).value = basicSalary.toNumber();
                worksheet.getCell(`H${rowIndex}`).value = contribution.toNumber();
                worksheet.getCell(`I${rowIndex}`).value = taxableIncome
                    .toDecimalPlaces(2)
                    .toNumber();
                worksheet.getCell(`I${rowIndex}`).numFmt = '#,##0.00';
                rowIndex++;
            });
        }
        else if (taxType === 'Pension') {
            worksheet.getCell('C3').value = new Date().toISOString().split('T')[0];
            worksheet.getCell('C4').value = taxFiling[0].company_name;
            worksheet.getCell('C5').value = taxFiling[0].company_tin;
            worksheet.getCell('C5').numFmt = '@';
            let rowIndex = 9;
            filingDetails.forEach((detail, index) => {
                const empContribution = new decimal_js_1.default(detail.contribution_amount || 0);
                const employerContribution = new decimal_js_1.default(detail.employer_contribution || 0);
                const total = empContribution.plus(employerContribution);
                worksheet.getCell(`B${rowIndex}`).value = index + 1;
                worksheet.getCell(`C${rowIndex}`).value = detail.pension_pin || 'N/A';
                worksheet.getCell(`C${rowIndex}`).numFmt = '@';
                worksheet.getCell(`D${rowIndex}`).value = detail.first_name;
                worksheet.getCell(`E${rowIndex}`).value = detail.last_name;
                worksheet.getCell(`F${rowIndex}`).value = detail.employee_id || 'N/A';
                worksheet.getCell(`F${rowIndex}`).numFmt = '@';
                worksheet.getCell(`G${rowIndex}`).value = '10%';
                worksheet.getCell(`H${rowIndex}`).value = '8%';
                worksheet.getCell(`I${rowIndex}`).value =
                    employerContribution.toNumber();
                worksheet.getCell(`J${rowIndex}`).value = empContribution.toNumber();
                worksheet.getCell(`K${rowIndex}`).value = total
                    .toDecimalPlaces(2)
                    .toNumber();
                worksheet.getCell(`K${rowIndex}`).numFmt = '#,##0.00';
                rowIndex++;
            });
        }
        else if (taxType === 'NHF') {
            worksheet.getCell('C3').value = new Date().toISOString().split('T')[0];
            worksheet.getCell('C4').value = taxFiling[0].company_name;
            worksheet.getCell('C5').value = taxFiling[0].company_tin;
            worksheet.getCell('C5').numFmt = '@';
            let rowIndex = 10;
            filingDetails.forEach((detail, index) => {
                const basicSalary = new decimal_js_1.default(detail.basic_salary || 0);
                const nhfContribution = basicSalary.mul(0.025).toDecimalPlaces(2);
                worksheet.getCell(`B${rowIndex}`).value = index + 1;
                worksheet.getCell(`C${rowIndex}`).value = detail.nhf_number || 'N/A';
                worksheet.getCell(`C${rowIndex}`).numFmt = '@';
                worksheet.getCell(`D${rowIndex}`).value = detail.first_name;
                worksheet.getCell(`E${rowIndex}`).value = detail.last_name;
                worksheet.getCell(`F${rowIndex}`).value = detail.employee_id || 'N/A';
                worksheet.getCell(`G${rowIndex}`).value = '2.5%';
                worksheet.getCell(`H${rowIndex}`).value = basicSalary.toNumber();
                worksheet.getCell(`I${rowIndex}`).value = nhfContribution.toNumber();
                worksheet.getCell(`I${rowIndex}`).numFmt = '#,##0.00';
                rowIndex++;
            });
        }
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
    async generateVoluntaryDeductionsExcel(deductionName, payrollMonth) {
        const records = await this.db
            .select({
            employee_id: deduction_schema_1.filingVoluntaryDeductions.employeeId,
            employee_name: deduction_schema_1.filingVoluntaryDeductions.employeeName,
            amount: deduction_schema_1.filingVoluntaryDeductions.amount,
            payroll_id: deduction_schema_1.filingVoluntaryDeductions.payrollId,
            payroll_month: deduction_schema_1.filingVoluntaryDeductions.payrollMonth,
            deductionName: deduction_schema_1.filingVoluntaryDeductions.deductionName,
        })
            .from(deduction_schema_1.filingVoluntaryDeductions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(deduction_schema_1.filingVoluntaryDeductions.deductionName, deductionName), (0, drizzle_orm_1.eq)(deduction_schema_1.filingVoluntaryDeductions.payrollMonth, payrollMonth)))
            .execute();
        if (!records.length) {
            throw new Error('No voluntary deductions found for the given criteria.');
        }
        const workbook = new exceljs_1.Workbook();
        const worksheet = workbook.addWorksheet(`${deductionName}-${payrollMonth}`);
        worksheet.addRow([
            'S/N',
            'Employee Name',
            'Deduction Name',
            'Payroll Month',
            'Amount',
        ]);
        records.forEach((record, index) => {
            worksheet.addRow([
                index + 1,
                record.employee_name,
                record.deductionName,
                record.payroll_month,
                new decimal_js_1.default(record.amount).toFixed(2),
            ]);
        });
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
};
exports.TaxService = TaxService;
exports.TaxService = TaxService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        pusher_service_1.PusherService,
        deductions_service_1.DeductionsService])
], TaxService);
//# sourceMappingURL=tax.service.js.map