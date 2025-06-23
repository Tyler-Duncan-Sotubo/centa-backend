import { WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { PayslipService } from './payslip/payslip.service';
import { TaxService } from './tax/tax.service';
import { PdfService } from 'src/common/services/pdf.service';
export declare class PayrollProcessor extends WorkerHost {
    private readonly payslipService;
    private readonly taxService;
    private readonly pdfService;
    private readonly queue;
    constructor(payslipService: PayslipService, taxService: TaxService, pdfService: PdfService, queue: Queue);
    process(job: Job): Promise<void>;
    private retryWithLogging;
    private handleGeneratePayslips;
    private handlePopulateTaxDetails;
    private handleGeneratePayslipPdf;
}
