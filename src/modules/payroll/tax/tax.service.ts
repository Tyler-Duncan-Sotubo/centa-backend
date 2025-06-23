import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { eq, and, sql } from 'drizzle-orm';
import * as path from 'path';
import { Workbook } from 'exceljs';
import { CacheService } from 'src/common/cache/cache.service';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { payroll } from '../schema/payroll-run.schema';
import { companyTaxDetails } from 'src/modules/core/company/schema/company-tax-details.schema';
import { companies, employeeFinancials, employees } from 'src/drizzle/schema';
import { taxFilingDetails, taxFilings } from '../schema/tax.schema';
import { PusherService } from 'src/modules/notification/services/pusher.service';
import Decimal from 'decimal.js';
import { DeductionsService } from '../deductions/deductions.service';
import { filingVoluntaryDeductions } from '../schema/deduction.schema';

@Injectable()
export class TaxService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly cache: CacheService,
    private readonly pusher: PusherService,
    private readonly deductions: DeductionsService,
  ) {}

  async onPayrollApproval(
    company_id: string,
    payrollMonth: string,
    payrollRunId: string,
  ) {
    const payrollRecords = await this.db
      .selectDistinctOn([payroll.employeeId], {
        payrollId: payroll.id,
        companyId: payroll.companyId,
        payrollMonth: payroll.payrollMonth,
        employeeId: employees.id,
        firstName: employees.firstName,
        lastName: employees.lastName,
        basicSalary: sql<string>`payroll.gross_salary`,
        payeTax: sql<string>`payroll.paye_tax`,
        pensionContribution: sql<string>`payroll.pension_contribution`,
        employerPensionContribution: sql<string>`payroll.employer_pension_contribution`,
        nhfContribution: sql<string>`payroll.nhf_contribution`,
        employeeTin: employeeFinancials.tin,
        employeePensionPin: employeeFinancials.pensionPin,
        employeeNhfNumber: employeeFinancials.nhfNumber,
        taxableAmount: sql<string>`payroll.taxable_income`,
        voluntaryDeductions: payroll.voluntaryDeductions,
      })
      .from(payroll)
      .innerJoin(employees, eq(payroll.employeeId, employees.id))
      .innerJoin(
        employeeFinancials,
        eq(employeeFinancials.employeeId, employees.id),
      )
      .where(
        and(
          eq(payroll.companyId, company_id),
          eq(payroll.payrollMonth, payrollMonth),
          eq(payroll.payrollRunId, payrollRunId),
          eq(payroll.paymentStatus, 'paid'),
        ),
      )
      .execute();

    if (!payrollRecords.length) {
      throw new BadRequestException('No approved payroll records found');
    }

    const [company] = await this.db
      .select({
        company_id: companies.id,
        company_tin: companyTaxDetails.tin,
      })
      .from(companies)
      .where(eq(companies.id, company_id))
      .innerJoin(
        companyTaxDetails,
        eq(companies.id, companyTaxDetails.companyId),
      )
      .execute();

    if (!company) {
      throw new BadRequestException('Company not found');
    }

    type TaxType = 'PAYE' | 'Pension' | 'NHF';
    const filingMap = new Map<TaxType, { filingId: string; details: any[] }>();

    for (const record of payrollRecords) {
      const taxEntries: [TaxType, Decimal][] = [
        ['PAYE', new Decimal(record.payeTax)],
        ['Pension', new Decimal(record.pensionContribution)],
        ['NHF', new Decimal(record.nhfContribution)],
      ];

      for (const [taxType, amount] of taxEntries) {
        if (amount.lte(0)) continue;

        if (!filingMap.has(taxType)) {
          const filingId = await this.db
            .insert(taxFilings)
            .values({
              companyId: company.company_id,
              companyTin: company.company_tin,
              taxType,
              payrollMonth: record.payrollMonth.toString(),
              referenceNumber: taxType,
              payrollId: record.payrollId,
            })
            .returning({ id: taxFilings.id })
            .execute()
            .then((res) => res[0].id);

          filingMap.set(taxType, { filingId, details: [] });
        }

        const filing = filingMap.get(taxType);
        filing!.details.push({
          taxFilingId: filing!.filingId,
          employeeId: record.employeeId,
          name: `${record.firstName} ${record.lastName}`,
          basicSalary: new Decimal(record.basicSalary).toFixed(2),
          contributionAmount: amount.toFixed(2),
          tin: record.employeeTin,
          pensionPin: record.employeePensionPin,
          nhfNumber: record.employeeNhfNumber,
          employerContribution: new Decimal(
            record.employerPensionContribution,
          ).toFixed(2),
          taxableAmount: new Decimal(record.taxableAmount).toFixed(2),
        });
      }
    }

    for (const { details } of filingMap.values()) {
      await this.db.insert(taxFilingDetails).values(details).execute();
    }

    await this.deductions.processVoluntaryDeductionsFromPayroll(
      payrollRecords,
      payrollRunId,
      company_id,
    );

    await this.pusher.createNotification(
      company_id,
      `Your tax filings have been created successfully for the month of ${payrollMonth}`,
      'tax',
    );

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

    // 1. Fetch statutory tax filings
    const statutoryFilings = await this.db
      .select({
        id: taxFilings.id,
        tax_type: taxFilings.taxType,
        total_deductions: sql<number>`SUM(
          CASE 
            WHEN tax_filings.tax_type = 'Pension'
            THEN ${taxFilingDetails.contributionAmount} + ${taxFilingDetails.employerContribution}
            WHEN tax_filings.tax_type != 'Pension'
            THEN ${taxFilingDetails.contributionAmount}
            ELSE 0
          END
        )`.as('total_deductions'),
        status: taxFilings.status,
        month: taxFilings.payrollMonth,
      })
      .from(taxFilings)
      .innerJoin(
        taxFilingDetails,
        eq(taxFilings.id, taxFilingDetails.taxFilingId),
      )
      .where(eq(taxFilings.companyId, company_id))
      .groupBy(taxFilings.taxType, taxFilings.status, taxFilings.id)
      .execute();

    // 2. Fetch voluntary deduction filings
    const voluntaryFilings = await this.db
      .select({
        id: sql<string>`CONCAT('voluntary_', ${filingVoluntaryDeductions.payrollId}, '_', ${filingVoluntaryDeductions.deductionName})`.as(
          'id',
        ),
        tax_type: filingVoluntaryDeductions.deductionName,
        total_deductions:
          sql<number>`SUM(${filingVoluntaryDeductions.amount})`.as(
            'total_deductions',
          ),
        status: filingVoluntaryDeductions.status, // Or add a status column to the table
        month: filingVoluntaryDeductions.payrollMonth,
      })
      .from(filingVoluntaryDeductions)
      .where(eq(filingVoluntaryDeductions.companyId, company_id))
      .groupBy(
        filingVoluntaryDeductions.deductionName,
        filingVoluntaryDeductions.payrollMonth,
        filingVoluntaryDeductions.payrollId,
        filingVoluntaryDeductions.status,
      )
      .execute();

    // 3. Combine both
    return [...statutoryFilings, ...voluntaryFilings];
  }

  async updateCompanyTaxFilings(tax_filing_id: string, status: string) {
    const res = await this.db
      .update(taxFilings)
      .set({
        status,
      })
      .where(eq(taxFilings.id, tax_filing_id))
      .execute();

    return res;
  }

  async generateTaxFilingExcel(tax_filing_id: string) {
    const taxFiling = await this.db
      .select({
        company_name: companies.name,
        company_tin: taxFilings.companyTin,
        payroll_month: taxFilings.payrollMonth,
        tax_type: taxFilings.taxType,
      })
      .from(taxFilings)
      .innerJoin(companies, eq(taxFilings.companyId, companies.id))
      .where(eq(taxFilings.id, tax_filing_id))
      .execute();

    if (!taxFiling.length)
      throw new Error('No tax filing data found for the given ID.');

    const filingDetails = await this.db
      .select({
        tin: taxFilingDetails.tin,
        pension_pin: taxFilingDetails.pensionPin,
        nhf_number: taxFilingDetails.nhfNumber,
        employee_id: employees.employeeNumber,
        first_name: employees.firstName,
        last_name: employees.lastName,
        basic_salary: taxFilingDetails.basicSalary,
        contribution_amount: taxFilingDetails.contributionAmount,
        employer_contribution: taxFilingDetails.employerContribution,
        taxable_amount: taxFilingDetails.taxableAmount,
      })
      .from(taxFilingDetails)
      .innerJoin(employees, eq(taxFilingDetails.employeeId, employees.id))
      .where(eq(taxFilingDetails.taxFilingId, tax_filing_id))
      .execute();

    if (!filingDetails.length)
      throw new Error('No employee details found for this tax filing.');

    let templateFile = '';
    let sheetName = '';
    const taxType = taxFiling[0].tax_type;

    if (taxType === 'PAYE') {
      templateFile = 'tax_template.xlsx';
      sheetName = 'sheet';
    } else if (taxType === 'Pension') {
      templateFile = 'pension_template.xlsx';
      sheetName = 'Month';
    } else if (taxType === 'NHF') {
      templateFile = 'nhf_template.xlsx';
      sheetName = 'Month';
    } else {
      throw new Error("Invalid tax type. Expected 'PAYE' or 'Pension'.");
    }

    const templatePath = path.resolve(
      process.cwd(),
      'src/templates',
      templateFile,
    );
    const workbook = new Workbook();
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
        const basicSalary = new Decimal(detail.basic_salary || 0);
        const contribution = new Decimal(detail.contribution_amount || 0);
        const taxableIncome = new Decimal(detail.taxable_amount || 0);

        worksheet.getCell(`A${rowIndex}`).value = String(index + 1);
        worksheet.getCell(`B${rowIndex}`).value = String(detail.tin || 'N/A');
        worksheet.getCell(`C${rowIndex}`).value = String(
          detail.employee_id || 'N/A',
        );
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
    } else if (taxType === 'Pension') {
      worksheet.getCell('C3').value = new Date().toISOString().split('T')[0];
      worksheet.getCell('C4').value = taxFiling[0].company_name;
      worksheet.getCell('C5').value = taxFiling[0].company_tin;
      worksheet.getCell('C5').numFmt = '@';

      let rowIndex = 9;
      filingDetails.forEach((detail, index) => {
        const empContribution = new Decimal(detail.contribution_amount || 0);
        const employerContribution = new Decimal(
          detail.employer_contribution || 0,
        );
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
    } else if (taxType === 'NHF') {
      worksheet.getCell('C3').value = new Date().toISOString().split('T')[0];
      worksheet.getCell('C4').value = taxFiling[0].company_name;
      worksheet.getCell('C5').value = taxFiling[0].company_tin;
      worksheet.getCell('C5').numFmt = '@';

      let rowIndex = 10;
      filingDetails.forEach((detail, index) => {
        const basicSalary = new Decimal(detail.basic_salary || 0);
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

  async generateVoluntaryDeductionsExcel(
    deductionName: string,
    payrollMonth: string,
  ) {
    const records = await this.db
      .select({
        employee_id: filingVoluntaryDeductions.employeeId,
        employee_name: filingVoluntaryDeductions.employeeName,
        amount: filingVoluntaryDeductions.amount,
        payroll_id: filingVoluntaryDeductions.payrollId,
        payroll_month: filingVoluntaryDeductions.payrollMonth,
        deductionName: filingVoluntaryDeductions.deductionName,
      })
      .from(filingVoluntaryDeductions)
      .where(
        and(
          eq(filingVoluntaryDeductions.deductionName, deductionName),
          eq(filingVoluntaryDeductions.payrollMonth, payrollMonth),
        ),
      )
      .execute();

    if (!records.length) {
      throw new Error('No voluntary deductions found for the given criteria.');
    }

    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet(`${deductionName}-${payrollMonth}`);

    // Add header row
    worksheet.addRow([
      'S/N',
      'Employee Name',
      'Deduction Name',
      'Payroll Month',
      'Amount',
    ]);

    // Add data rows
    records.forEach((record, index) => {
      worksheet.addRow([
        index + 1,
        record.employee_name,
        record.deductionName,
        record.payroll_month,
        new Decimal(record.amount).toFixed(2),
      ]);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
