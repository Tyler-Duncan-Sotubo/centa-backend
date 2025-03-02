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
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const payroll_schema_1 = require("../../drizzle/schema/payroll.schema");
const employee_schema_1 = require("../../drizzle/schema/employee.schema");
const company_schema_1 = require("../../drizzle/schema/company.schema");
const tax_schema_1 = require("../../drizzle/schema/tax.schema");
const cache_service_1 = require("../../config/cache/cache.service");
const path = require("path");
const exceljs_1 = require("exceljs");
let TaxService = class TaxService {
    constructor(db, cache) {
        this.db = db;
        this.cache = cache;
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
    async onPayrollApproval(company_id, payrollMonth) {
        const payrollRecords = await this.db
            .select({
            payroll_id: payroll_schema_1.payroll.id,
            company_id: payroll_schema_1.payroll.company_id,
            payroll_month: payroll_schema_1.payroll.payroll_month,
            employee_id: employee_schema_1.employees.id,
            first_name: employee_schema_1.employees.first_name,
            last_name: employee_schema_1.employees.last_name,
            basic_salary: payroll_schema_1.payroll.gross_salary,
            paye_tax: payroll_schema_1.payroll.paye_tax,
            pension_contribution: payroll_schema_1.payroll.pension_contribution,
            nhf_contribution: payroll_schema_1.payroll.nhf_contribution,
            employee_tin: employee_schema_1.employee_tax_details.tin,
            taxable_amount: payroll_schema_1.payroll.taxable_income,
        })
            .from(payroll_schema_1.payroll)
            .innerJoin(employee_schema_1.employees, (0, drizzle_orm_1.eq)(payroll_schema_1.payroll.employee_id, employee_schema_1.employees.id))
            .innerJoin(employee_schema_1.employee_tax_details, (0, drizzle_orm_1.eq)(payroll_schema_1.payroll.employee_id, employee_schema_1.employees.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_schema_1.payroll.company_id, company_id), (0, drizzle_orm_1.eq)(payroll_schema_1.payroll.payroll_month, payrollMonth), (0, drizzle_orm_1.eq)(payroll_schema_1.payroll.payment_status, 'paid')))
            .execute();
        if (!payrollRecords.length) {
            throw new Error('No approved payroll records found');
        }
        const company = await this.db
            .select({
            company_id: company_schema_1.companies.id,
            company_tin: company_schema_1.company_tax_details.tin,
        })
            .from(company_schema_1.companies)
            .where((0, drizzle_orm_1.eq)(company_schema_1.companies.id, payrollRecords[0].company_id))
            .innerJoin(company_schema_1.company_tax_details, (0, drizzle_orm_1.eq)(company_schema_1.companies.id, payrollRecords[0].company_id))
            .execute()
            .then((res) => res[0]);
        if (!company) {
            throw new Error('Company not found');
        }
        const taxData = {
            PAYE: [],
            Pension: [],
            NHF: [],
        };
        for (const record of payrollRecords) {
            if (record.paye_tax > 0)
                taxData.PAYE.push(record);
            if (record.pension_contribution > 0)
                taxData.Pension.push(record);
            if (record.nhf_contribution > 0)
                taxData.NHF.push(record);
        }
        for (const [taxType, records] of Object.entries(taxData)) {
            if (records.length === 0)
                continue;
            const payrollMonth = records[0].payroll_month
                ? new Date(records[0].payroll_month).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0];
            const taxFilingId = await this.db
                .insert(tax_schema_1.tax_filings)
                .values({
                company_id: company.company_id,
                company_tin: company.company_tin,
                tax_type: taxType,
                payroll_month: payrollMonth,
                reference_number: taxType,
                payroll_id: payrollRecords[0].payroll_id,
            })
                .returning({ id: tax_schema_1.tax_filings.id })
                .execute()
                .then((res) => res[0].id);
            const taxDetails = records.map((record) => ({
                tax_filing_id: taxFilingId,
                employee_id: record.employee_id,
                name: `${record.first_name} ${record.last_name}`,
                basic_salary: record.basic_salary.toString(),
                contribution_amount: taxType === 'PAYE'
                    ? record.paye_tax.toString()
                    : taxType === 'Pension'
                        ? record.pension_contribution.toString()
                        : record.nhf_contribution.toString(),
                tin: record.employee_tin,
                taxable_amount: record.taxable_amount.toString(),
            }));
            await this.db.insert(tax_schema_1.tax_filing_details).values(taxDetails).execute();
        }
        return { message: 'Tax filings created successfully' };
    }
    async getCompanyTaxFilings(user_id) {
        const company_id = await this.getCompany(user_id);
        return await this.db
            .select({
            id: tax_schema_1.tax_filings.id,
            tax_type: tax_schema_1.tax_filings.tax_type,
            total_deductions: (0, drizzle_orm_1.sql) `SUM(${tax_schema_1.tax_filing_details.contribution_amount})`.as('total_deductions'),
            status: tax_schema_1.tax_filings.status,
            month: tax_schema_1.tax_filings.payroll_month,
        })
            .from(tax_schema_1.tax_filings)
            .innerJoin(tax_schema_1.tax_filing_details, (0, drizzle_orm_1.eq)(tax_schema_1.tax_filings.id, tax_schema_1.tax_filing_details.tax_filing_id))
            .where((0, drizzle_orm_1.eq)(tax_schema_1.tax_filings.company_id, company_id))
            .groupBy(tax_schema_1.tax_filings.tax_type, tax_schema_1.tax_filings.status, tax_schema_1.tax_filings.id)
            .execute();
    }
    async updateCompanyTaxFilings(tax_filing_id, status) {
        console.log(tax_filing_id);
        const res = await this.db
            .update(tax_schema_1.tax_filings)
            .set({
            status,
        })
            .where((0, drizzle_orm_1.eq)(tax_schema_1.tax_filings.id, tax_filing_id))
            .execute();
        return res;
    }
    async generateTaxFilingExcel(tax_filing_id) {
        const taxFiling = await this.db
            .select({
            company_name: company_schema_1.companies.name,
            company_address: company_schema_1.companies.address,
            company_tin: tax_schema_1.tax_filings.company_tin,
            payroll_month: tax_schema_1.tax_filings.payroll_month,
            tax_type: tax_schema_1.tax_filings.tax_type,
        })
            .from(tax_schema_1.tax_filings)
            .innerJoin(company_schema_1.companies, (0, drizzle_orm_1.eq)(tax_schema_1.tax_filings.company_id, company_schema_1.companies.id))
            .where((0, drizzle_orm_1.eq)(tax_schema_1.tax_filings.id, tax_filing_id))
            .execute();
        if (!taxFiling.length) {
            throw new Error('No tax filing data found for the given ID.');
        }
        const filingDetails = await this.db
            .selectDistinctOn([tax_schema_1.tax_filing_details.employee_id], {
            tin: tax_schema_1.tax_filing_details.tin,
            employee_id: employee_schema_1.employees.employee_number,
            role: employee_schema_1.employees.job_title,
            first_name: employee_schema_1.employees.first_name,
            last_name: employee_schema_1.employees.last_name,
            basic_salary: tax_schema_1.tax_filing_details.basic_salary,
            contribution_amount: tax_schema_1.tax_filing_details.contribution_amount,
            taxable_amount: tax_schema_1.tax_filing_details.taxable_amount,
        })
            .from(tax_schema_1.tax_filing_details)
            .innerJoin(employee_schema_1.employees, (0, drizzle_orm_1.eq)(tax_schema_1.tax_filing_details.employee_id, employee_schema_1.employees.id))
            .where((0, drizzle_orm_1.eq)(tax_schema_1.tax_filing_details.tax_filing_id, tax_filing_id))
            .execute();
        if (!filingDetails.length) {
            throw new Error('No employee details found for this tax filing.');
        }
        let templateFile = '';
        let sheetName = '';
        if (taxFiling[0].tax_type === 'PAYE') {
            templateFile = 'tax_template.xlsx';
            sheetName = 'sheet';
        }
        else if (taxFiling[0].tax_type === 'Pension') {
            templateFile = 'pension_template.xlsx';
            sheetName = 'Month';
        }
        else if (taxFiling[0].tax_type === 'NHF') {
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
        if (!worksheet) {
            throw new Error(`Worksheet '${sheetName}' not found in ${templateFile}`);
        }
        if (taxFiling[0].tax_type === 'PAYE') {
            worksheet.getCell('B7').value = taxFiling[0].company_name;
            worksheet.getCell('B8').value = taxFiling[0].company_address || 'N/A';
            worksheet.getCell('B9').value = taxFiling[0].company_tin;
            worksheet.getCell('B10').value = new Date().toISOString().split('T')[0];
            worksheet.getCell('B11').value = taxFiling[0].payroll_month
                .toString()
                .split('T')[0];
            let rowIndex = 16;
            filingDetails.forEach((detail, index) => {
                worksheet.getCell(`A${rowIndex}`).value = String(index + 1);
                worksheet.getCell(`B${rowIndex}`).value = String(detail.tin || 'N/A');
                worksheet.getCell(`C${rowIndex}`).value = String(detail.employee_id || 'N/A');
                worksheet.getCell(`D${rowIndex}`).value = detail.role || 'N/A';
                worksheet.getCell(`E${rowIndex}`).value = detail.last_name;
                worksheet.getCell(`F${rowIndex}`).value = detail.first_name;
                worksheet.getCell(`G${rowIndex}`).value =
                    parseFloat(detail.basic_salary) || 0;
                worksheet.getCell(`H${rowIndex}`).value =
                    parseFloat(detail.contribution_amount) || 0;
                const taxableIncome = parseFloat(detail.taxable_amount) || 0;
                worksheet.getCell(`I${rowIndex}`).value = taxableIncome / 12;
                worksheet.getCell(`I${rowIndex}`).numFmt = '#,##0.00';
                rowIndex++;
            });
        }
        else if (taxFiling[0].tax_type === 'Pension') {
            worksheet.getCell('C3').value = new Date().toISOString().split('T')[0];
            worksheet.getCell('C4').value = taxFiling[0].company_name;
            worksheet.getCell('C5').value = taxFiling[0].company_tin;
            worksheet.getCell('C5').numFmt = '@';
            worksheet.getCell('C6').value = taxFiling[0].company_address || 'N/A';
            let rowIndex = 9;
            filingDetails.forEach((detail, index) => {
                const basicSalary = parseFloat(detail.basic_salary) || 0;
                const employeeContribution = parseFloat(detail.contribution_amount) || 0;
                const employerContribution = Math.round((basicSalary * 10) / 100);
                worksheet.getCell(`B${rowIndex}`).value = index + 1;
                worksheet.getCell(`C${rowIndex}`).value = detail.tin || 'N/A';
                worksheet.getCell(`C${rowIndex}`).numFmt = '@';
                worksheet.getCell(`D${rowIndex}`).value = detail.first_name;
                worksheet.getCell(`E${rowIndex}`).value = detail.last_name;
                worksheet.getCell(`F${rowIndex}`).value = detail.employee_id || 'N/A';
                worksheet.getCell(`F${rowIndex}`).numFmt = '@';
                worksheet.getCell(`G${rowIndex}`).value = '10%';
                worksheet.getCell(`H${rowIndex}`).value = '8%';
                worksheet.getCell(`I${rowIndex}`).value = employerContribution;
                worksheet.getCell(`J${rowIndex}`).value = employeeContribution;
                worksheet.getCell(`K${rowIndex}`).value =
                    employerContribution + employeeContribution;
                worksheet.getCell(`K${rowIndex}`).numFmt = '#,##0.00';
                rowIndex++;
            });
        }
        else if (taxFiling[0].tax_type === 'NHF') {
            worksheet.getCell('C3').value = new Date().toISOString().split('T')[0];
            worksheet.getCell('C4').value = taxFiling[0].company_name;
            worksheet.getCell('C5').value = taxFiling[0].company_tin;
            worksheet.getCell('C5').numFmt = '@';
            worksheet.getCell('C6').value = taxFiling[0].company_address || 'N/A';
            let rowIndex = 10;
            filingDetails.forEach((detail, index) => {
                const basicSalary = parseFloat(detail.basic_salary) || 0;
                const nhfContribution = Math.round((basicSalary * 2.5) / 100);
                worksheet.getCell(`B${rowIndex}`).value = index + 1;
                worksheet.getCell(`C${rowIndex}`).value = detail.tin || 'N/A';
                worksheet.getCell(`C${rowIndex}`).numFmt = '@';
                worksheet.getCell(`D${rowIndex}`).value = detail.first_name;
                worksheet.getCell(`E${rowIndex}`).value = detail.last_name;
                worksheet.getCell(`F${rowIndex}`).value = detail.employee_id || 'N/A';
                worksheet.getCell(`G${rowIndex}`).value = '2.5%';
                worksheet.getCell(`H${rowIndex}`).value = basicSalary;
                worksheet.getCell(`I${rowIndex}`).value = nhfContribution;
                worksheet.getCell(`I${rowIndex}`).numFmt = '#,##0.00';
                rowIndex++;
            });
        }
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
};
exports.TaxService = TaxService;
exports.TaxService = TaxService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService])
], TaxService);
//# sourceMappingURL=tax.service.js.map