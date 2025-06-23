import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { PayslipService } from './payslip/payslip.service';
import { TaxService } from './tax/tax.service';
import { PdfService } from 'src/common/services/pdf.service';

@Processor('payrollQueue')
export class PayrollProcessor extends WorkerHost {
  constructor(
    private readonly payslipService: PayslipService,
    private readonly taxService: TaxService,
    private readonly pdfService: PdfService,
    @InjectQueue('payrollQueue') private readonly queue: Queue,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    try {
      switch (job.name) {
        case 'generatePayslips':
          await this.retryWithLogging(
            () => this.handleGeneratePayslips(job.data),
            job.name,
          );
          break;

        case 'populateTaxDetails':
          await this.retryWithLogging(
            () => this.handlePopulateTaxDetails(job.data),
            job.name,
          );
          break;

        case 'generatePayslipPdf':
          await this.retryWithLogging(
            () => this.handleGeneratePayslipPdf(job.data),
            job.name,
          );
          break;

        default:
          console.warn(`⚠️ Unhandled job type: ${job.name}`);
      }
    } catch (error) {
      console.error(`❌ Final error in job ${job.name}:`, error);
      throw error;
    }
  }

  private async retryWithLogging(
    task: () => Promise<void>,
    jobName: string,
    attempts = 3,
    delay = 1000,
  ) {
    for (let i = 1; i <= attempts; i++) {
      try {
        await task();
        return;
      } catch (err) {
        console.warn(`⏱️ Attempt ${i} failed for ${jobName}:`, err);
        if (i < attempts) await new Promise((res) => setTimeout(res, delay));
        else throw err;
      }
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
