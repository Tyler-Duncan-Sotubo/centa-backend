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
const payslip_service_1 = require("./payslip.service");
const pdfkit_table_1 = require("pdfkit-table");
const axios_1 = require("axios");
const aws_service_1 = require("../../config/aws/aws.service");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const payroll_schema_1 = require("../../drizzle/schema/payroll.schema");
const drizzle_orm_1 = require("drizzle-orm");
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
        const payslipData = await this.payslipService.getEmployeePayslip(payslipId);
        if (!payslipData)
            throw new Error('Payslip not found');
        const doc = new pdfkit_table_1.default({ margin: 30 });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        const pdfBuffer = new Promise(async (resolve) => {
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(buffers);
                resolve(pdfBuffer);
            });
            let logoBuffer;
            try {
                const response = await axios_1.default.get(`${payslipData.company_logo}`, {
                    responseType: 'arraybuffer',
                });
                logoBuffer = Buffer.from(response.data, 'binary');
            }
            catch (error) {
                console.error('Failed to load logo:', error.message);
            }
            const leftX = 30;
            doc
                .fontSize(18)
                .font('Helvetica-Bold')
                .text(`${payslipData.company_name}`, leftX, 30);
            doc
                .fontSize(12)
                .text(`${payslipData.company_address}, ${payslipData.company_city}`, leftX, 50);
            doc.text(`Email ${payslipData.company_email}`, leftX, 65);
            if (logoBuffer) {
                const logoWidth = 50;
                const pageWidth = doc.page.width;
                const logoX = pageWidth - logoWidth - 30;
                doc.image(logoBuffer, logoX, 30, { width: logoWidth });
            }
            doc.moveDown(2);
            doc
                .fontSize(16)
                .text(`Payslip - ${payslipData.payroll_month}`, { align: 'center' });
            doc.moveDown();
            doc
                .fontSize(12)
                .text(`Employee: ${payslipData.first_name} ${payslipData.last_name}`, {
                align: 'right',
            });
            doc.text(`Email: ${payslipData.email}`, { align: 'right' });
            doc.text(`Issued At: ${payslipData.issued_at ? new Date(payslipData.issued_at).toDateString() : 'N/A'}`, {
                align: 'right',
            });
            doc.moveDown(2);
            const summaryTable = {
                headers: [
                    { label: 'Description', align: 'left' },
                    { label: 'Amount', align: 'right' },
                ],
                rows: [
                    [
                        'Net Pay This Period',
                        `N${Number(payslipData.net_salary).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    ],
                    [
                        'Gross Salary',
                        `N${Number(payslipData.gross_salary).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    ],
                ],
            };
            doc.text('Summary', { underline: true });
            doc.moveDown(1);
            doc.table(summaryTable, {
                prepareHeader: () => doc.font('Helvetica-Bold').fontSize(12),
                prepareRow: () => doc.font('Helvetica').fontSize(11),
                padding: [5, 10, 10, 5],
            });
            const deductionsTable = {
                headers: [
                    { label: 'Description', align: 'left' },
                    { label: 'Amount', align: 'right' },
                ],
                rows: [
                    [
                        'PAYE Tax',
                        `N${Number(payslipData.paye_tax).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    ],
                    [
                        'Pension Contribution',
                        `N${Number(payslipData.pension_contribution).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    ],
                    [
                        'NHF Contribution',
                        `N${Number(payslipData.nhf_contribution).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    ],
                    ...(payslipData.salaryAdvance && payslipData.salaryAdvance > 0
                        ? [
                            [
                                'Salary Advance',
                                `N${Number(payslipData.salaryAdvance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                            ],
                        ]
                        : []),
                    [
                        'Total Deductions',
                        `N${Number(payslipData.paye_tax + payslipData.pension_contribution + payslipData.nhf_contribution + (payslipData.salaryAdvance ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    ],
                ],
            };
            doc.moveDown(2);
            doc.text('Taxes and Deductions Summary', { underline: true });
            doc.moveDown(1);
            doc.table(deductionsTable, {
                prepareHeader: () => doc.font('Helvetica-Bold').fontSize(12),
                prepareRow: () => doc.font('Helvetica').fontSize(11),
                padding: [5, 10, 10, 5],
            });
            doc.moveDown(12);
            doc
                .fontSize(10)
                .text(`If you have any questions about this payslip, please contact ${payslipData.company_email}`, { align: 'center' });
            doc.end();
        });
        const pdfUrl = await this.awsService.uploadPdfToS3(payslipData.email, 'payslip.pdf', await pdfBuffer);
        await this.db
            .update(payroll_schema_1.payslips)
            .set({
            pdf_url: pdfUrl,
        })
            .where((0, drizzle_orm_1.eq)(payroll_schema_1.payslips.id, payslipData.id))
            .execute();
        return pdfBuffer;
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