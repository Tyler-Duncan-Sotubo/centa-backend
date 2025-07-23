import { Module } from '@nestjs/common';
import { OfferLetterService } from './offer-letter.service';
import { OfferLetterController } from './offer-letter.controller';
import { OfferLetterPdfService } from './offer-letter-pdf.service';
import { OfferPdfProcessor } from '../offer-pdf.processor';

@Module({
  controllers: [OfferLetterController],
  providers: [OfferLetterService, OfferLetterPdfService, OfferPdfProcessor],
  exports: [OfferLetterService, OfferLetterPdfService],
})
export class OfferLetterModule {}
