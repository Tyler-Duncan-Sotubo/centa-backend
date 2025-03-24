import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PayslipService } from './services/payslip.service';
import { TaxService } from './services/tax.service';
import { PdfService } from './services/pdf.service';

@Processor('payrollQueue')
export class PayrollProcessor extends WorkerHost {
  constructor(
    private readonly payslipService: PayslipService,
    private readonly taxService: TaxService,
    private readonly pdfService: PdfService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    console.log(`🔄 Processing job: ${job.name}`);

    try {
      switch (job.name) {
        case 'generatePayslips':
          await this.handleGeneratePayslips(job.data);
          break;

        case 'populateTaxDetails':
          await this.handlePopulateTaxDetails(job.data);
          break;

        case 'generatePayslipPdf':
          await this.handleGeneratePayslipPdf(job.data);
          break;

        default:
          console.warn(`⚠️ Unhandled job: ${job.name}`);
      }

      console.log(`✅ Job completed: ${job.name}`);
    } catch (error) {
      console.error(`❌ Error processing job (${job.name}):`, error);
      throw error;
    }
  }

  private async handleGeneratePayslips(data: any) {
    const { company_id, payrollMonth } = data;
    await this.payslipService.generatePayslipsForCompany(
      company_id,
      payrollMonth,
    );
  }

  private async handlePopulateTaxDetails(data: any) {
    const { company_id, payrollMonth, payrollRunId } = data;
    await this.taxService.onPayrollApproval(
      company_id,
      payrollMonth,
      payrollRunId,
    );
  }

  private async handleGeneratePayslipPdf(data: any) {
    const { payslipId } = data;
    await this.pdfService.generatePayslipPdf(payslipId);
  }
}
