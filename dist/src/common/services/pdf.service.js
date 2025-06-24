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
exports.PdfService = void 0;
const common_1 = require("@nestjs/common");
const client_s3_1 = require("@aws-sdk/client-s3");
const payslip_service_1 = require("../../modules/payroll/payslip/payslip.service");
const aws_service_1 = require("../aws/aws.service");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const payslip_schema_1 = require("../../modules/payroll/schema/payslip.schema");
const drizzle_orm_1 = require("drizzle-orm");
const puppeteer_1 = require("puppeteer");
const formatCurrency_1 = require("../../utils/formatCurrency");
let PdfService = class PdfService {
    constructor(db, payslipService, awsService) {
        this.db = db;
        this.payslipService = payslipService;
        this.awsService = awsService;
        this.bucketName = process.env.S3_BUCKET_NAME || 'your-bucket-name';
        this.s3 = new client_s3_1.S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            },
        });
    }
    async generatePayslipPdf(payslipId) {
        const payslip = await this.payslipService.getEmployeePayslip(payslipId);
        if (!payslip)
            throw new Error('Payslip not found');
        const ytdBasic = Number(payslip.ytdBasic);
        const ytdHousing = Number(payslip.ytdHousing);
        const ytdTransport = Number(payslip.ytdTransport);
        const ytdGross = Number(payslip.ytdGross);
        const otherAllowance = Number(payslip.gross_salary) -
            (Number(payslip.basic) +
                Number(payslip.housing) +
                Number(payslip.transport));
        const otherAllowanceYTD = ytdGross - (ytdBasic + ytdHousing + ytdTransport);
        const totalDeductions = Number(payslip.paye_tax) +
            Number(payslip.pension_contribution) +
            Number(payslip.nhf_contribution) +
            Number(payslip.salaryAdvance);
        const reimbursementTotal = Array.isArray(payslip.reimbursement)
            ? payslip.reimbursement.reduce((sum, r) => sum + Number(r.amount), 0)
            : 0;
        const netPay = Number(payslip.gross_salary) - totalDeductions + reimbursementTotal;
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
              ${(0, formatCurrency_1.formatCurrency)(Number(payslip.net_salary))}
            </div>
          </div>
      
          <!-- 3. Earnings -->
          <h2>Earnings</h2>
          <table>
            <thead>
              <tr><th>Description</th><th class="amount">Amount</th><th class="amount">YTD</th></tr>
            </thead>
            <tbody>
              <tr><td>Basic</td><td class="amount">${(0, formatCurrency_1.formatCurrency)(Number(payslip.basic))}</td><td class="amount">${(0, formatCurrency_1.formatCurrency)(ytdBasic)}</td></tr>
              <tr><td>Housing</td><td class="amount">${(0, formatCurrency_1.formatCurrency)(Number(payslip.housing))}</td><td class="amount">${(0, formatCurrency_1.formatCurrency)(ytdHousing)}</td></tr>
              <tr><td>Transport</td><td class="amount">${(0, formatCurrency_1.formatCurrency)(Number(payslip.transport))}</td><td class="amount">${(0, formatCurrency_1.formatCurrency)(ytdTransport)}</td></tr>
              <tr><td>Other Allowance</td><td class="amount">${(0, formatCurrency_1.formatCurrency)(otherAllowance)}</td><td class="amount">${(0, formatCurrency_1.formatCurrency)(otherAllowanceYTD)}</td></tr>
              <tr><td><strong>Gross Earnings</strong></td><td class="amount"><strong>${(0, formatCurrency_1.formatCurrency)(Number(payslip.gross_salary))}</strong></td><td class="amount"><strong>${(0, formatCurrency_1.formatCurrency)(ytdGross)}</strong></td></tr>
            </tbody>
          </table>
      
          <!-- 4. Deductions -->
          <h2>Deductions</h2>
          <table>
            <thead>
              <tr><th>Description</th><th class="amount">Amount</th><th class="amount">YTD</th></tr>
            </thead>
            <tbody>
              <tr><td>PAYE Tax</td><td class="amount">${(0, formatCurrency_1.formatCurrency)(Number(payslip.paye_tax))}</td><td class="amount">${(0, formatCurrency_1.formatCurrency)(Number(payslip.ytdPaye))}</td></tr>
              <tr><td>Pension Contribution</td><td class="amount">${(0, formatCurrency_1.formatCurrency)(Number(payslip.pension_contribution))}</td><td class="amount">${(0, formatCurrency_1.formatCurrency)(Number(payslip.ytdPension))}</td></tr>
              <tr><td>NHF Contribution</td><td class="amount">${(0, formatCurrency_1.formatCurrency)(Number(payslip.nhf_contribution))}</td><td class="amount">${(0, formatCurrency_1.formatCurrency)(Number(payslip.ytdNhf))}</td></tr>
              ${Number(payslip.salaryAdvance) > 0
            ? `
                <tr><td>Salary Advance</td><td class="amount">${(0, formatCurrency_1.formatCurrency)(Number(payslip.salaryAdvance))}</td><td class="amount">—</td></tr>
              `
            : ''}
              <tr><td><strong>Total Deductions</strong></td><td class="amount"><strong>${(0, formatCurrency_1.formatCurrency)(totalDeductions)}</strong></td><td class="amount"></td></tr>
            </tbody>
          </table>
      
          <!-- 5. Reimbursements -->
          ${Array.isArray(payslip.reimbursement) &&
            payslip.reimbursement.length > 0
            ? `
              <!-- 5. Reimbursements -->
              <h2>Reimbursements</h2>
              <table>
                <thead><tr><th>Description</th><th class="amount">Amount</th><th class="amount">—</th></tr></thead>
                <tbody>
                  ${payslip.reimbursement
                .map((r) => `
                        <tr>
                          <td>${r.expenseName}</td>
                          <td class="amount">${(0, formatCurrency_1.formatCurrency)(r.amount)}</td>
                          <td class="amount">—</td>
                        </tr>
                      `)
                .join('')}
                  <tr>
                    <td><strong>Total Reimbursement</strong></td>
                    <td class="amount"><strong>${(0, formatCurrency_1.formatCurrency)(reimbursementTotal)}</strong></td>
                    <td class="amount"></td>
                  </tr>
                </tbody>
              </table>
              `
            : ''}
          
          <!-- 6. Net Pay Calculation -->
          <h2>Net Pay Calculation</h2>
          <table>
            <thead><tr><th>Description</th><th class="amount">Amount</th></tr></thead>
            <tbody>
              <tr><td>Gross Earnings</td><td class="amount">${(0, formatCurrency_1.formatCurrency)(Number(payslip.gross_salary))}</td></tr>
              <tr><td>- Total Deductions</td><td class="amount">- ${(0, formatCurrency_1.formatCurrency)(totalDeductions)}</td></tr>
              <tr><td>+ Reimbursements</td><td class="amount">${(0, formatCurrency_1.formatCurrency)(reimbursementTotal)}</td></tr>
              <tr><td><strong>NET PAY</strong></td><td class="amount"><strong>${(0, formatCurrency_1.formatCurrency)(netPay)}</strong></td></tr>
            </tbody>
          </table>
      
          <div class="footer">
            If you have any questions about this payslip, please contact ${payslip.company_email}
          </div>
        </body>
      </html>
      `;
        const browser = await puppeteer_1.default.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfUint8Array = await page.pdf({
            format: 'A4',
            printBackground: true,
        });
        const pdfBuffer = Buffer.from(pdfUint8Array);
        await browser.close();
        const pdfUrl = await this.awsService.uploadPdfToS3(payslip.email, `payslip-${payslip.payroll_month}.pdf`, pdfBuffer);
        await this.db
            .update(payslip_schema_1.paySlips)
            .set({ pdfUrl })
            .where((0, drizzle_orm_1.eq)(payslip_schema_1.paySlips.id, payslip.id))
            .execute();
        return Buffer.from(pdfBuffer);
    }
};
exports.PdfService = PdfService;
exports.PdfService = PdfService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, payslip_service_1.PayslipService,
        aws_service_1.AwsService])
], PdfService);
//# sourceMappingURL=pdf.service.js.map