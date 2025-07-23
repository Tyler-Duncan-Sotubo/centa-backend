import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { and, eq } from 'drizzle-orm';
import { renderOfferLetter, wrapInHtml } from 'src/utils/renderOfferLetter';
import { extractHandlebarsVariables } from 'src/utils/extractHandlebarsVariables';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { AwsService } from 'src/common/aws/aws.service';
import { offerLetterTemplates } from './schema/offer-letter-templates.schema';
import { generatedOfferLetters } from './schema/generated-offer-letters.schema';
import { chromium } from 'playwright';
import { offers } from '../schema/offers.schema';

@Injectable()
export class OfferLetterPdfService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly awsService: AwsService,
  ) {}

  /**
   * Main entry: render HTML using template and data,
   * generate PDF, upload to S3, persist metadata.
   */
  async generateAndUploadPdf({
    templateId,
    offerId,
    candidateId,
    generatedBy,
    data,
  }: {
    templateId: string;
    offerId?: string;
    candidateId: string;
    generatedBy?: string;
    data: Record<string, any>;
  }) {
    /* 1. Fetch the template */
    const [template] = await this.db
      .select()
      .from(offerLetterTemplates)
      .where(and(eq(offerLetterTemplates.id, templateId)));

    if (!template) {
      throw new BadRequestException('Template not found');
    }

    /* 2. Validate required variables */
    const required = extractHandlebarsVariables(template.content);
    const missing = required.filter((v) => !(v in data));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Missing template variables: ${missing.join(', ')}`,
      );
    }

    /* 3. Render the HTML */
    const rawHtml = renderOfferLetter(template.content, data);
    const html = wrapInHtml(rawHtml);

    /* 4. Generate PDF */
    const pdfBuffer = await this.htmlToPdf(html);

    /* 5. Upload to S3 */
    const sanitizedName =
      data.candidateFullName?.replace(/\s+/g, '-').toLowerCase() ||
      'offer-letter';

    const timestamp = Date.now();
    const fileName = `offer-letter__${sanitizedName}__${candidateId}__offered__${timestamp}.pdf`;

    const pdfUrl = await this.awsService.uploadPdfToS3(
      sanitizedName,
      fileName,
      pdfBuffer,
    );

    if (pdfUrl) {
      if (!offerId) {
        throw new BadRequestException(
          'offerId is required to update the offer letter URL',
        );
      }
      await this.db
        .update(offers)
        .set({ letterUrl: pdfUrl })
        .where(eq(offers.id, offerId));
    }

    /* 6. Save to generated_offer_letters */
    await this.db.insert(generatedOfferLetters).values({
      candidateId,
      offerId,
      templateId,
      fileName,
      fileUrl: pdfUrl,
      status: 'pending',
      generatedBy,
    });

    return pdfBuffer;
  }

  async uploadSignedOffer(
    signedFile: { name: string; type: string; base64: string },
    candidateFullName: string,
    candidateId: string,
  ) {
    let signedUrl = signedFile.base64;
    const [meta, base64Data] = signedFile.base64.split(',');
    const isPdf = meta.includes('application/pdf');

    const sanitizedName =
      candidateFullName?.replace(/\s+/g, '-').toLowerCase() || 'offer-letter';

    const timestamp = Date.now();

    if (isPdf) {
      // Convert raw Base64 → Buffer (PDF helper expects Buffer)
      const pdfBuffer = Buffer.from(base64Data, 'base64');
      const fileName = `offer-letter__${sanitizedName}__${candidateId}__signed__${timestamp}.pdf`;
      signedUrl = await this.awsService.uploadPdfToS3(
        sanitizedName,
        fileName,
        pdfBuffer,
      );
    } else {
      // If not PDF, assume it's an image and upload as image
      throw new BadRequestException(
        'Only PDF files are allowed for signed offer letters',
      );
    }

    if (!signedUrl) {
      throw new BadRequestException('Failed to upload signed offer letter');
    }

    return signedUrl;
  }

  /** Internal helper: Convert HTML → PDF using Playwright */
  private async htmlToPdf(html: string): Promise<Buffer> {
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.setContent(html, { waitUntil: 'load' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '10mm',
        bottom: '30mm',
        left: '15mm',
        right: '15mm',
      },
      printBackground: true,
    });

    await browser.close();
    return pdfBuffer;
  }
}
