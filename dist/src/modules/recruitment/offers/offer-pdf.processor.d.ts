import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { OfferLetterPdfService } from './offer-letter/offer-letter-pdf.service';
export declare class OfferPdfProcessor extends WorkerHost {
    private readonly pdfService;
    private readonly logger;
    constructor(pdfService: OfferLetterPdfService);
    process(job: Job): Promise<void>;
    private handleGeneratePdf;
    private retryWithLogging;
}
