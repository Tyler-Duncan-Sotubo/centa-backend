"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfferLetterPdfService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const renderOfferLetter_1 = require("../../../../utils/renderOfferLetter");
const extractHandlebarsVariables_1 = require("../../../../utils/extractHandlebarsVariables");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const aws_service_1 = require("../../../../common/aws/aws.service");
const offer_letter_templates_schema_1 = require("./schema/offer-letter-templates.schema");
const generated_offer_letters_schema_1 = require("./schema/generated-offer-letters.schema");
const playwright_1 = require("playwright");
const offers_schema_1 = require("../schema/offers.schema");
let OfferLetterPdfService = class OfferLetterPdfService {
    constructor(db, awsService) {
        this.db = db;
        this.awsService = awsService;
    }
    async generateAndUploadPdf({ templateId, offerId, candidateId, generatedBy, data, }) {
        const [template] = await this.db
            .select()
            .from(offer_letter_templates_schema_1.offerLetterTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.id, templateId)));
        if (!template) {
            throw new common_1.BadRequestException('Template not found');
        }
        const required = (0, extractHandlebarsVariables_1.extractHandlebarsVariables)(template.content);
        const missing = required.filter((v) => !(v in data));
        if (missing.length > 0) {
            throw new common_1.BadRequestException(`Missing template variables: ${missing.join(', ')}`);
        }
        const rawHtml = (0, renderOfferLetter_1.renderOfferLetter)(template.content, data);
        const html = (0, renderOfferLetter_1.wrapInHtml)(rawHtml);
        const pdfBuffer = await this.htmlToPdf(html);
        const sanitizedName = data.candidateFullName?.replace(/\s+/g, '-').toLowerCase() ||
            'offer-letter';
        const timestamp = Date.now();
        const fileName = `offer-letter__${sanitizedName}__${candidateId}__offered__${timestamp}.pdf`;
        const pdfUrl = await this.awsService.uploadPdfToS3(sanitizedName, fileName, pdfBuffer);
        if (pdfUrl) {
            if (!offerId) {
                throw new common_1.BadRequestException('offerId is required to update the offer letter URL');
            }
            await this.db
                .update(offers_schema_1.offers)
                .set({ letterUrl: pdfUrl })
                .where((0, drizzle_orm_1.eq)(offers_schema_1.offers.id, offerId));
        }
        await this.db.insert(generated_offer_letters_schema_1.generatedOfferLetters).values({
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
    async uploadSignedOffer(signedFile, candidateFullName, candidateId) {
        let signedUrl = signedFile.base64;
        const [meta, base64Data] = signedFile.base64.split(',');
        const isPdf = meta.includes('application/pdf');
        const sanitizedName = candidateFullName?.replace(/\s+/g, '-').toLowerCase() || 'offer-letter';
        const timestamp = Date.now();
        if (isPdf) {
            const pdfBuffer = Buffer.from(base64Data, 'base64');
            const fileName = `offer-letter__${sanitizedName}__${candidateId}__signed__${timestamp}.pdf`;
            signedUrl = await this.awsService.uploadPdfToS3(sanitizedName, fileName, pdfBuffer);
        }
        else {
            throw new common_1.BadRequestException('Only PDF files are allowed for signed offer letters');
        }
        if (!signedUrl) {
            throw new common_1.BadRequestException('Failed to upload signed offer letter');
        }
        return signedUrl;
    }
    async htmlToPdf(html) {
        const browser = await playwright_1.chromium.launch({
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
};
exports.OfferLetterPdfService = OfferLetterPdfService;
exports.OfferLetterPdfService = OfferLetterPdfService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, aws_service_1.AwsService])
], OfferLetterPdfService);
//# sourceMappingURL=offer-letter-pdf.service.js.map