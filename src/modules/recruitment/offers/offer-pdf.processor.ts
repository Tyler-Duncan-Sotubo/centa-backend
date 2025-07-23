// src/modules/offers/offer-pdf.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BadRequestException, Logger } from '@nestjs/common';
import { OfferLetterPdfService } from './offer-letter/offer-letter-pdf.service';

@Processor('offerPdfQueue')
export class OfferPdfProcessor extends WorkerHost {
  private readonly logger = new Logger(OfferPdfProcessor.name);

  constructor(private readonly pdfService: OfferLetterPdfService) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { name, data } = job;

    try {
      switch (name) {
        case 'generate-offer-pdf':
          await this.retryWithLogging(() => this.handleGeneratePdf(data), name);
          break;
        default:
          this.logger.warn(`Unhandled job: ${name}`);
      }
    } catch (BadRequestException) {
      this.logger.error(
        `Final BadRequestException in job ${name}:`,
        BadRequestException,
      );
      throw BadRequestException;
    }
  }

  private async handleGeneratePdf(data: any): Promise<void> {
    const { templateId, offerId, candidateId, generatedBy, payload } = data;

    if (!templateId || !candidateId || !payload) {
      throw new BadRequestException(
        'Missing required job data (templateId, candidateId, payload)',
      );
    }

    await this.pdfService.generateAndUploadPdf({
      templateId,
      offerId,
      candidateId,
      generatedBy,
      data: payload,
    });

    this.logger.log(
      `✅ PDF generated and uploaded for candidate ${candidateId}`,
    );
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
        this.logger.warn(
          `⏱️ Attempt ${i} failed for ${jobName}: ${err.message}`,
        );
        if (i < attempts) await new Promise((res) => setTimeout(res, delay));
        else throw err;
      }
    }
  }
}
