import { WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { PayslipService } from './services/payslip.service';
import { TaxService } from './services/tax.service';
import { PdfService } from './services/pdf.service';
import { PushNotificationService } from 'src/notification/services/push-notification.service';
export declare class PayrollProcessor extends WorkerHost {
    private readonly payslipService;
    private readonly taxService;
    private readonly pdfService;
    private readonly pushNotificationService;
    private readonly queue;
    constructor(payslipService: PayslipService, taxService: TaxService, pdfService: PdfService, pushNotificationService: PushNotificationService, queue: Queue);
    process(job: Job): Promise<void>;
    private retryWithLogging;
    private handleGeneratePayslips;
    private handlePopulateTaxDetails;
    private handleGeneratePayslipPdf;
    private sendNotification;
}
