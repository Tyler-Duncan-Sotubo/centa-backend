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
var OfferPdfProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfferPdfProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const offer_letter_pdf_service_1 = require("./offer-letter/offer-letter-pdf.service");
let OfferPdfProcessor = OfferPdfProcessor_1 = class OfferPdfProcessor extends bullmq_1.WorkerHost {
    constructor(pdfService) {
        super();
        this.pdfService = pdfService;
        this.logger = new common_1.Logger(OfferPdfProcessor_1.name);
    }
    async process(job) {
        const { name, data } = job;
        try {
            switch (name) {
                case 'generate-offer-pdf':
                    await this.retryWithLogging(() => this.handleGeneratePdf(data), name);
                    break;
                default:
                    this.logger.warn(`Unhandled job: ${name}`);
            }
        }
        catch (BadRequestException) {
            this.logger.error(`Final BadRequestException in job ${name}:`, BadRequestException);
            throw BadRequestException;
        }
    }
    async handleGeneratePdf(data) {
        const { templateId, offerId, candidateId, generatedBy, payload } = data;
        if (!templateId || !candidateId || !payload) {
            throw new common_1.BadRequestException('Missing required job data (templateId, candidateId, payload)');
        }
        await this.pdfService.generateAndUploadPdf({
            templateId,
            offerId,
            candidateId,
            generatedBy,
            data: payload,
        });
        this.logger.log(`✅ PDF generated and uploaded for candidate ${candidateId}`);
    }
    async retryWithLogging(task, jobName, attempts = 3, delay = 1000) {
        for (let i = 1; i <= attempts; i++) {
            try {
                await task();
                return;
            }
            catch (err) {
                this.logger.warn(`⏱️ Attempt ${i} failed for ${jobName}: ${err.message}`);
                if (i < attempts)
                    await new Promise((res) => setTimeout(res, delay));
                else
                    throw err;
            }
        }
    }
};
exports.OfferPdfProcessor = OfferPdfProcessor;
exports.OfferPdfProcessor = OfferPdfProcessor = OfferPdfProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('offerPdfQueue'),
    __metadata("design:paramtypes", [offer_letter_pdf_service_1.OfferLetterPdfService])
], OfferPdfProcessor);
//# sourceMappingURL=offer-pdf.processor.js.map