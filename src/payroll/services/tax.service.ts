import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import { eq, and, sql } from 'drizzle-orm';
import { payroll } from 'src/drizzle/schema/payroll.schema';
import {
  employee_tax_details,
  employees,
} from 'src/drizzle/schema/employee.schema';
import {
  companies,
  company_tax_details,
} from 'src/drizzle/schema/company.schema';
import { tax_filing_details, tax_filings } from 'src/drizzle/schema/tax.schema';
import { CacheService } from 'src/config/cache/cache.service';
import * as path from 'path';
import { Workbook } from 'exceljs';

@Injectable()
export class TaxService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly cache: CacheService,
  ) {}

  async onPayrollApproval(
    company_id: string,
    payrollMonth: string,
    payrollRunId: string,
  ) {
    // Fetch approved payroll details
    const payrollRecords = await this.db
      .selectDistinctOn([payroll.employee_id], {
        payroll_id: payroll.id,
        company_id: payroll.company_id,
        payroll_month: payroll.payroll_month,
        employee_id: employees.id,
        first_name: employees.first_name,
        last_name: employees.last_name,
        basic_salary: payroll.gross_salary,
        paye_tax: payroll.paye_tax,
        pension_contribution: payroll.pension_contribution,
        nhf_contribution: payroll.nhf_contribution,
        employee_tin: employee_tax_details.tin, // Use actual TIN from employee schema
        taxable_amount: payroll.taxable_income,
      })
      .from(payroll)
      .innerJoin(employees, eq(payroll.employee_id, employees.id))
      .innerJoin(employee_tax_details, eq(payroll.employee_id, employees.id))
      .where(
        and(
          eq(payroll.company_id, company_id),
          eq(payroll.payroll_month, payrollMonth),
          eq(payroll.payroll_run_id, payrollRunId),
          eq(payroll.payment_status, 'paid'),
        ),
      )
      .execute();

    if (!payrollRecords.length) {
      throw new Error('No approved payroll records found');
    }

    // Get company details
    const company = await this.db
      .select({
        company_id: companies.id,
        company_tin: company_tax_details.tin,
      })
      .from(companies)
      .where(eq(companies.id, payrollRecords[0].company_id))
      .innerJoin(
        company_tax_details,
        eq(companies.id, payrollRecords[0].company_id),
      )
      .execute()
      .then((res) => res[0]);

    if (!company) {
      throw new Error('Company not found');
    }

    // Define a type-safe tax contribution structure
    type PayrollRecord = {
      payroll_id: string;
      company_id: string;
      payroll_month: string;
      employee_id: string;
      first_name: string;
      last_name: string;
      basic_salary: number;
      taxable_amount: number;
      paye_tax: number;
      pension_contribution: number;
      nhf_contribution: number;
      employee_tin: string | null;
    };

    type TaxType = 'PAYE' | 'Pension' | 'NHF';

    const taxData: Record<TaxType, PayrollRecord[]> = {
      PAYE: [],
      Pension: [],
      NHF: [],
    };

    // Categorize payroll records into tax types
    for (const record of payrollRecords) {
      if (record.paye_tax > 0) taxData.PAYE.push(record);
      if (record.pension_contribution > 0) taxData.Pension.push(record);
      if (record.nhf_contribution > 0) taxData.NHF.push(record);
    }

    // Insert into tax_filings and tax_filing_details
    for (const [taxType, records] of Object.entries(taxData) as [
      TaxType,
      PayrollRecord[],
    ][]) {
      if (records.length === 0) continue;

      const payrollMonth = records[0].payroll_month
        ? new Date(records[0].payroll_month).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      const taxFilingId = await this.db
        .insert(tax_filings)
        .values({
          company_id: company.company_id,
          company_tin: company.company_tin,
          tax_type: taxType,
          payroll_month: payrollMonth,
          reference_number: taxType,
          payroll_id: payrollRecords[0].payroll_id,
        })
        .returning({ id: tax_filings.id })
        .execute()
        .then((res) => res[0].id);

      // Prepare and insert tax_filing_details
      const taxDetails = records.map((record) => ({
        tax_filing_id: taxFilingId,
        employee_id: record.employee_id,
        name: `${record.first_name} ${record.last_name}`, // Properly formatted name
        basic_salary: record.basic_salary.toString(),
        contribution_amount:
          taxType === 'PAYE'
            ? record.paye_tax.toString()
            : taxType === 'Pension'
              ? record.pension_contribution.toString()
              : record.nhf_contribution.toString(),
        tin: record.employee_tin,
        taxable_amount: record.taxable_amount.toString(),
      }));

      await this.db.insert(tax_filing_details).values(taxDetails).execute();
    }

    return { message: 'Tax filings created successfully' };
  }

  private getCompany = async (company_id: string) => {
    const cacheKey = `company_id_${company_id}`;

    return this.cache.getOrSetCache(cacheKey, async () => {
      const company = await this.db
        .select()
        .from(companies)
        .where(eq(companies.id, company_id))
        .execute();

      if (!company) throw new BadRequestException('Company not found');

      return company[0].id;
    });
  };

  async getCompanyTaxFilings(user_id: string) {
    const company_id = await this.getCompany(user_id);

    return await this.db
      .select({
        id: tax_filings.id,
        tax_type: tax_filings.tax_type,
        total_deductions: sql<number>`
      SUM(
        CASE WHEN tax_filings.tax_type = ${tax_filings.tax_type}
        THEN ${tax_filing_details.contribution_amount} ELSE 0 END
      )
    `.as('total_deductions'),
        status: tax_filings.status,
        month: tax_filings.payroll_month,
      })
      .from(tax_filings)
      .innerJoin(
        tax_filing_details,
        eq(tax_filings.id, tax_filing_details.tax_filing_id),
      )
      .where(eq(tax_filings.company_id, company_id))
      .groupBy(tax_filings.tax_type, tax_filings.status, tax_filings.id)
      .execute();
  }

  async updateCompanyTaxFilings(tax_filing_id: string, status: string) {
    console.log(tax_filing_id);
    const res = await this.db
      .update(tax_filings)
      .set({
        status,
      })
      .where(eq(tax_filings.id, tax_filing_id))
      .execute();

    return res;
  }

  async generateTaxFilingExcel(tax_filing_id: string) {
    // 1️⃣ Fetch Tax Filing Data
    const taxFiling = await this.db
      .select({
        company_name: companies.name,
        company_address: companies.address,
        company_tin: tax_filings.company_tin,
        payroll_month: tax_filings.payroll_month,
        tax_type: tax_filings.tax_type,
      })
      .from(tax_filings)
      .innerJoin(companies, eq(tax_filings.company_id, companies.id))
      .where(eq(tax_filings.id, tax_filing_id))
      .execute();

    if (!taxFiling.length) {
      throw new Error('No tax filing data found for the given ID.');
    }

    const filingDetails = await this.db
      .selectDistinctOn([tax_filing_details.employee_id], {
        tin: tax_filing_details.tin,
        employee_id: employees.employee_number,
        role: employees.job_title,
        first_name: employees.first_name,
        last_name: employees.last_name,
        basic_salary: tax_filing_details.basic_salary,
        contribution_amount: tax_filing_details.contribution_amount,
        taxable_amount: tax_filing_details.taxable_amount,
      })
      .from(tax_filing_details)
      .innerJoin(employees, eq(tax_filing_details.employee_id, employees.id))
      .where(eq(tax_filing_details.tax_filing_id, tax_filing_id))
      .execute();

    if (!filingDetails.length) {
      throw new Error('No employee details found for this tax filing.');
    }

    // 2️⃣ Determine which template to use
    let templateFile = '';
    let sheetName = '';
    if (taxFiling[0].tax_type === 'PAYE') {
      templateFile = 'tax_template.xlsx';
      sheetName = 'sheet'; // Update if the actual sheet name is different
    } else if (taxFiling[0].tax_type === 'Pension') {
      templateFile = 'pension_template.xlsx';
      sheetName = 'Month'; // Ensure correct sheet name
    } else if (taxFiling[0].tax_type === 'NHF') {
      templateFile = 'nhf_template.xlsx';
      sheetName = 'Month'; // Ensure correct sheet name
    } else {
      throw new Error("Invalid tax type. Expected 'PAYE' or 'Pension'.");
    }

    const templatePath = path.resolve(
      process.cwd(),
      'src/templates',
      templateFile,
    );

    // 3️⃣ Load Workbook
    const workbook = new Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.getWorksheet(sheetName);

    if (!worksheet) {
      throw new Error(`Worksheet '${sheetName}' not found in ${templateFile}`);
    }

    // 4️⃣ Populate Company Details
    if (taxFiling[0].tax_type === 'PAYE') {
      worksheet.getCell('B7').value = taxFiling[0].company_name;
      worksheet.getCell('B8').value = taxFiling[0].company_address || 'N/A';
      worksheet.getCell('B9').value = taxFiling[0].company_tin;
      worksheet.getCell('B10').value = new Date().toISOString().split('T')[0]; // Current Date
      worksheet.getCell('B11').value = taxFiling[0].payroll_month
        .toString()
        .split('T')[0];

      let rowIndex = 16; // Start row for employees

      // 5️⃣ Populate Employee Details
      filingDetails.forEach((detail, index) => {
        worksheet.getCell(`A${rowIndex}`).value = String(index + 1); // S/N as tex
        worksheet.getCell(`B${rowIndex}`).value = String(detail.tin || 'N/A'); // Ensure TIN remains text
        worksheet.getCell(`C${rowIndex}`).value = String(
          detail.employee_id || 'N/A',
        );
        worksheet.getCell(`D${rowIndex}`).value = detail.role || 'N/A';
        worksheet.getCell(`E${rowIndex}`).value = detail.last_name;
        worksheet.getCell(`F${rowIndex}`).value = detail.first_name;
        worksheet.getCell(`G${rowIndex}`).value =
          parseFloat(detail.basic_salary) || 0;
        worksheet.getCell(`H${rowIndex}`).value =
          parseFloat(detail.contribution_amount) || 0;

        // Ensure taxable income is divided and formatted
        const taxableIncome = parseFloat(detail.taxable_amount) || 0;
        worksheet.getCell(`I${rowIndex}`).value = taxableIncome / 12;
        worksheet.getCell(`I${rowIndex}`).numFmt = '#,##0.00'; // Format with commas

        rowIndex++;
      });
    } else if (taxFiling[0].tax_type === 'Pension') {
      worksheet.getCell('C3').value = new Date().toISOString().split('T')[0]; // Current Date
      worksheet.getCell('C4').value = taxFiling[0].company_name;
      worksheet.getCell('C5').value = taxFiling[0].company_tin;
      worksheet.getCell('C5').numFmt = '@'; // Forces text format
      worksheet.getCell('C6').value = taxFiling[0].company_address || 'N/A';

      let rowIndex = 9; // Start row for employees

      filingDetails.forEach((detail, index) => {
        const basicSalary = parseFloat(detail.basic_salary) || 0;
        const employeeContribution =
          parseFloat(detail.contribution_amount) || 0;
        const employerContribution = Math.round((basicSalary * 10) / 100);

        worksheet.getCell(`B${rowIndex}`).value = index + 1; // S/N
        worksheet.getCell(`C${rowIndex}`).value = detail.tin || 'N/A';
        worksheet.getCell(`C${rowIndex}`).numFmt = '@'; // Forces text format
        worksheet.getCell(`D${rowIndex}`).value = detail.first_name;
        worksheet.getCell(`E${rowIndex}`).value = detail.last_name;
        worksheet.getCell(`F${rowIndex}`).value = detail.employee_id || 'N/A';
        worksheet.getCell(`F${rowIndex}`).numFmt = '@'; // Forces text format
        worksheet.getCell(`G${rowIndex}`).value = '10%';
        worksheet.getCell(`H${rowIndex}`).value = '8%';
        worksheet.getCell(`I${rowIndex}`).value = employerContribution;
        worksheet.getCell(`J${rowIndex}`).value = employeeContribution;
        worksheet.getCell(`K${rowIndex}`).value =
          employerContribution + employeeContribution;
        worksheet.getCell(`K${rowIndex}`).numFmt = '#,##0.00'; // Ensure formatted numbers

        rowIndex++;
      });
    } else if (taxFiling[0].tax_type === 'NHF') {
      worksheet.getCell('C3').value = new Date().toISOString().split('T')[0]; // Current Date
      worksheet.getCell('C4').value = taxFiling[0].company_name;
      worksheet.getCell('C5').value = taxFiling[0].company_tin;
      worksheet.getCell('C5').numFmt = '@'; // Forces text format
      worksheet.getCell('C6').value = taxFiling[0].company_address || 'N/A';

      let rowIndex = 10; // Start row for employees

      filingDetails.forEach((detail, index) => {
        const basicSalary = parseFloat(detail.basic_salary) || 0;
        const nhfContribution = Math.round((basicSalary * 2.5) / 100);

        worksheet.getCell(`B${rowIndex}`).value = index + 1; // S/N
        worksheet.getCell(`C${rowIndex}`).value = detail.tin || 'N/A';
        worksheet.getCell(`C${rowIndex}`).numFmt = '@'; // Forces text format
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

    // 6️⃣ Convert to Buffer and Return
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
