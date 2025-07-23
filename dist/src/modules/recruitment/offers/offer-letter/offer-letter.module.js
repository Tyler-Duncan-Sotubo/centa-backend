"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfferLetterModule = void 0;
const common_1 = require("@nestjs/common");
const offer_letter_service_1 = require("./offer-letter.service");
const offer_letter_controller_1 = require("./offer-letter.controller");
const offer_letter_pdf_service_1 = require("./offer-letter-pdf.service");
const offer_pdf_processor_1 = require("../offer-pdf.processor");
let OfferLetterModule = class OfferLetterModule {
};
exports.OfferLetterModule = OfferLetterModule;
exports.OfferLetterModule = OfferLetterModule = __decorate([
    (0, common_1.Module)({
        controllers: [offer_letter_controller_1.OfferLetterController],
        providers: [offer_letter_service_1.OfferLetterService, offer_letter_pdf_service_1.OfferLetterPdfService, offer_pdf_processor_1.OfferPdfProcessor],
        exports: [offer_letter_service_1.OfferLetterService, offer_letter_pdf_service_1.OfferLetterPdfService],
    })
], OfferLetterModule);
//# sourceMappingURL=offer-letter.module.js.map