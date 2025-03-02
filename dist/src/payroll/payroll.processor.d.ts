import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PayslipService } from './services/payslip.service';
import { TaxService } from './services/tax.service';
import { PdfService } from './services/pdf.service';
export declare class PayrollProcessor extends WorkerHost {
    private readonly payslipService;
    private readonly taxService;
    private readonly pdfService;
    constructor(payslipService: PayslipService, taxService: TaxService, pdfService: PdfService);
    process(job: Job): Promise<void>;
}
