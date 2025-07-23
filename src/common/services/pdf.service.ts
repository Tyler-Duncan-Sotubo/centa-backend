import { Injectable, Inject } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { PayslipService } from 'src/modules/payroll/payslip/payslip.service';
import { AwsService } from '../aws/aws.service';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import { paySlips } from 'src/modules/payroll/schema/payslip.schema';
import { eq } from 'drizzle-orm';
import { chromium } from 'playwright';
import { formatCurrency } from 'src/utils/formatCurrency';

@Injectable()
export class PdfService {
  private s3: S3Client;
  private bucketName = process.env.S3_BUCKET_NAME || 'your-bucket-name';

  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly payslipService: PayslipService,
    private readonly awsService: AwsService,
  ) {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  async generatePayslipPdf(payslipId: string): Promise<Buffer> {
    const payslip = await this.payslipService.getEmployeePayslip(payslipId);
    if (!payslip) throw new Error('Payslip not found');

    // Prepare HTML template (you can move this into a separate file or render with EJS)
    const ytdBasic = Number(payslip.ytdBasic);
    const ytdHousing = Number(payslip.ytdHousing);
    const ytdTransport = Number(payslip.ytdTransport);
    const ytdGross = Number(payslip.ytdGross);

    const otherAllowance =
      Number(payslip.gross_salary) -
      (Number(payslip.basic) +
        Number(payslip.housing) +
        Number(payslip.transport));
    const otherAllowanceYTD = ytdGross - (ytdBasic + ytdHousing + ytdTransport);

    const totalDeductions =
      Number(payslip.paye_tax) +
      Number(payslip.pension_contribution) +
      Number(payslip.nhf_contribution) +
      Number(payslip.salaryAdvance);
    const reimbursementTotal = Array.isArray(payslip.reimbursement)
      ? payslip.reimbursement.reduce(
          (sum: number, r) => sum + Number(r.amount),
          0,
        )
      : 0;
    const netPay =
      Number(payslip.gross_salary) - totalDeductions + reimbursementTotal;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            :root {
              --border: #d9d9d9;
              --heading-bg: #f4f4f4;
              --section-space: 20px;
              --font-body: Arial, sans-serif;
            }
            body {
              font-family: var(--font-body);
              padding: 32px;
              color: #000;
              font-size: 12px;
            }
            h1 {
              font-size: 16px;
              margin: 0 0 10px;
            }
            h2 {
              margin-top: var(--section-space);
              border-bottom: 1px solid var(--border);
              padding-bottom: 4px;
              font-size: 13px;
            }
            .company-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 10px;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 6px 24px;
              margin-top: 10px;
            }
            .net-pay-box {
              text-align: right;
              border: 1px solid var(--border);
              padding: 10px;
              font-size: 14px;
              font-weight: bold;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 8px;
            }
            th, td {
              border: 1px solid var(--border);
              padding: 6px;
              font-size: 11px;
            }
            th {
              background-color: var(--heading-bg);
              text-align: left;
            }
            td.amount, th.amount {
              text-align: right;
            }
            .footer {
              margin-top: 40px;
              font-size: 10px;
              text-align: center;
              color: #666;
            }
          </style>

        </head>
        <body>
          <!-- 1. Header -->
          <div class="company-header">
            <div>
              <strong>${payslip.company_name}</strong><br />
            </div>
            <img src="${payslip.companyLogo}" alt="Company Logo" style="width: 60px; height: auto" />
          </div>
      
          <h1>Payslip for the month of ${new Date(payslip.payroll_month + '-01').toLocaleString('en-US', { month: 'long', year: 'numeric' })}</h1>
      
          <!-- 2. Summary -->
          <div class="summary-grid">
            <div>
              <strong>Employee Name:</strong> ${payslip.first_name} ${payslip.last_name}<br />
              <strong>Email:</strong> ${payslip.email}<br />
              <strong>Pay Date:</strong> ${payslip.payment_date}<br />
              <strong>Status:</strong> ${payslip.status}
            </div>
            <div class="net-pay-box">
              Employee Net Pay<br />
              ${formatCurrency(Number(payslip.net_salary))}
            </div>
          </div>
      
          <!-- 3. Earnings -->
          <h2>Earnings</h2>
          <table>
            <thead>
              <tr><th>Description</th><th class="amount">Amount</th><th class="amount">YTD</th></tr>
            </thead>
            <tbody>
              <tr><td>Basic</td><td class="amount">${formatCurrency(Number(payslip.basic))}</td><td class="amount">${formatCurrency(ytdBasic)}</td></tr>
              <tr><td>Housing</td><td class="amount">${formatCurrency(Number(payslip.housing))}</td><td class="amount">${formatCurrency(ytdHousing)}</td></tr>
              <tr><td>Transport</td><td class="amount">${formatCurrency(Number(payslip.transport))}</td><td class="amount">${formatCurrency(ytdTransport)}</td></tr>
              <tr><td>Other Allowance</td><td class="amount">${formatCurrency(otherAllowance)}</td><td class="amount">${formatCurrency(otherAllowanceYTD)}</td></tr>
              <tr><td><strong>Gross Earnings</strong></td><td class="amount"><strong>${formatCurrency(Number(payslip.gross_salary))}</strong></td><td class="amount"><strong>${formatCurrency(ytdGross)}</strong></td></tr>
            </tbody>
          </table>
      
          <!-- 4. Deductions -->
          <h2>Deductions</h2>
          <table>
            <thead>
              <tr><th>Description</th><th class="amount">Amount</th><th class="amount">YTD</th></tr>
            </thead>
            <tbody>
              <tr><td>PAYE Tax</td><td class="amount">${formatCurrency(Number(payslip.paye_tax))}</td><td class="amount">${formatCurrency(Number(payslip.ytdPaye))}</td></tr>
              <tr><td>Pension Contribution</td><td class="amount">${formatCurrency(Number(payslip.pension_contribution))}</td><td class="amount">${formatCurrency(Number(payslip.ytdPension))}</td></tr>
              <tr><td>NHF Contribution</td><td class="amount">${formatCurrency(Number(payslip.nhf_contribution))}</td><td class="amount">${formatCurrency(Number(payslip.ytdNhf))}</td></tr>
              ${
                Number(payslip.salaryAdvance) > 0
                  ? `
                <tr><td>Salary Advance</td><td class="amount">${formatCurrency(Number(payslip.salaryAdvance))}</td><td class="amount">—</td></tr>
              `
                  : ''
              }
              <tr><td><strong>Total Deductions</strong></td><td class="amount"><strong>${formatCurrency(totalDeductions)}</strong></td><td class="amount"></td></tr>
            </tbody>
          </table>
      
          <!-- 5. Reimbursements -->
          ${
            Array.isArray(payslip.reimbursement) &&
            payslip.reimbursement.length > 0
              ? `
              <!-- 5. Reimbursements -->
              <h2>Reimbursements</h2>
              <table>
                <thead><tr><th>Description</th><th class="amount">Amount</th><th class="amount">—</th></tr></thead>
                <tbody>
                  ${payslip.reimbursement
                    .map(
                      (r) => `
                        <tr>
                          <td>${r.expenseName}</td>
                          <td class="amount">${formatCurrency(r.amount)}</td>
                          <td class="amount">—</td>
                        </tr>
                      `,
                    )
                    .join('')}
                  <tr>
                    <td><strong>Total Reimbursement</strong></td>
                    <td class="amount"><strong>${formatCurrency(reimbursementTotal)}</strong></td>
                    <td class="amount"></td>
                  </tr>
                </tbody>
              </table>
              `
              : ''
          }
          
          <!-- 6. Net Pay Calculation -->
          <h2>Net Pay Calculation</h2>
          <table>
            <thead><tr><th>Description</th><th class="amount">Amount</th></tr></thead>
            <tbody>
              <tr><td>Gross Earnings</td><td class="amount">${formatCurrency(Number(payslip.gross_salary))}</td></tr>
              <tr><td>- Total Deductions</td><td class="amount">- ${formatCurrency(totalDeductions)}</td></tr>
              <tr><td>+ Reimbursements</td><td class="amount">${formatCurrency(reimbursementTotal)}</td></tr>
              <tr><td><strong>NET PAY</strong></td><td class="amount"><strong>${formatCurrency(netPay)}</strong></td></tr>
            </tbody>
          </table>
      
          <div class="footer">
            If you have any questions about this payslip, please contact ${payslip.company_email}
          </div>
        </body>
      </html>
      `;

    const pdfBuffer = await this.htmlToPdf(htmlContent);

    // Upload to S3
    const pdfUrl = await this.awsService.uploadPdfToS3(
      payslip.email,
      `payslip/payslip-${payslip.payroll_month}.pdf`,
      pdfBuffer,
    );

    // Update DB
    await this.db
      .update(paySlips)
      .set({ pdfUrl })
      .where(eq(paySlips.id, payslip.id))
      .execute();

    return Buffer.from(pdfBuffer);
  }

  /** Internal helper: Convert HTML → PDF using Playwright */
  private async htmlToPdf(html: string): Promise<Buffer> {
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.setContent(html, { waitUntil: 'load' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '10mm',
        bottom: '30mm',
        left: '15mm',
        right: '15mm',
      },
      printBackground: true,
    });

    await browser.close();
    return pdfBuffer;
  }
}
