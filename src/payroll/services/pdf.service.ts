import { Inject, Injectable } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { PayslipService } from './payslip.service';
import PDFDocument from 'pdfkit-table';
import axios from 'axios';
import { AwsService } from 'src/config/aws/aws.service';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import { payslips } from 'src/drizzle/schema/payroll.schema';
import { eq } from 'drizzle-orm';

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
    const payslipData = await this.payslipService.getEmployeePayslip(payslipId);
    if (!payslipData) throw new Error('Payslip not found');

    const doc = new PDFDocument({ margin: 30 });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));

    const pdfBuffer = new Promise<Buffer>(async (resolve) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // **Fetch Logo from URL**
      let logoBuffer;
      try {
        const response = await axios.get(`${payslipData.company_logo}`, {
          responseType: 'arraybuffer',
        });
        logoBuffer = Buffer.from(response.data, 'binary');
      } catch (error) {
        console.error('Failed to load logo:', error.message);
      }

      // **Company Info on the Left**
      const leftX = 30; // Left alignment
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .text(`${payslipData.company_name}`, leftX, 30);
      doc
        .fontSize(12)
        .text(
          `${payslipData.company_address}, ${payslipData.company_city}`,
          leftX,
          50,
        );
      doc.text(`Email ${payslipData.company_email}`, leftX, 65);

      // **Logo on the Right**
      if (logoBuffer) {
        const logoWidth = 50;
        const pageWidth = doc.page.width;
        const logoX = pageWidth - logoWidth - 30; // Right alignment with margin
        doc.image(logoBuffer, logoX, 30, { width: logoWidth });
      }

      doc.moveDown(2);

      // **Payslip Header**
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
      doc.text(
        `Issued At: ${payslipData.issued_at ? new Date(payslipData.issued_at).toDateString() : 'N/A'}`,
        {
          align: 'right',
        },
      );
      doc.moveDown(2);

      // **Summary Table**
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

      // Render the table with custom font sizes
      doc.table(summaryTable, {
        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(12),
        prepareRow: () => doc.font('Helvetica').fontSize(11),
        padding: [5, 10, 10, 5],
      });

      // **Deductions Table**
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
            : []), // Conditionally add this row
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

      // **Footer Handling**
      doc.moveDown(12);

      doc
        .fontSize(10)
        .text(
          `If you have any questions about this payslip, please contact ${payslipData.company_email}`,
          { align: 'center' },
        );

      // **Finish PDF Generation**
      doc.end();
    });

    const pdfUrl = await this.awsService.uploadPdfToS3(
      payslipData.email,
      'payslip.pdf',
      await pdfBuffer,
    );

    await this.db
      .update(payslips)
      .set({
        pdf_url: pdfUrl,
      })
      .where(eq(payslips.id, payslipData.id))
      .execute();

    return pdfBuffer;
  }
}
