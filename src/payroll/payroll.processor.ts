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
    const { name, data } = job;

    try {
      if (name === 'generatePayslips') {
        const { company_id, payrollMonth } = data;
        await this.payslipService.generatePayslipsForCompany(
          company_id,
          payrollMonth,
        );
      } else if (name === 'populateTaxDetails') {
        const { company_id, payrollMonth } = data;
        await this.taxService.onPayrollApproval(company_id, payrollMonth);
      } else if (name === 'generatePayslipPdf') {
        const { payslipId } = data;

        await this.pdfService.generatePayslipPdf(payslipId);
      } else {
        console.warn(`Unhandled job name: ${name}`);
      }
    } catch (error) {
      console.error(`Failed to process job (${name}): ${error.message}`);
      throw error;
    }
  }
}
