"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OffersModule = void 0;
const common_1 = require("@nestjs/common");
const offers_service_1 = require("./offers.service");
const offers_controller_1 = require("./offers.controller");
const offer_letter_module_1 = require("./offer-letter/offer-letter.module");
const bullmq_1 = require("@nestjs/bullmq");
const send_offer_service_1 = require("./send-offer.service");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const offer_email_service_1 = require("../../notification/services/offer-email.service");
let OffersModule = class OffersModule {
};
exports.OffersModule = OffersModule;
exports.OffersModule = OffersModule = __decorate([
    (0, common_1.Module)({
        imports: [
            offer_letter_module_1.OfferLetterModule,
            bullmq_1.BullModule.registerQueue({
                name: 'offerPdfQueue',
            }),
        ],
        controllers: [offers_controller_1.OffersController],
        providers: [
            offers_service_1.OffersService,
            send_offer_service_1.SendOffersService,
            offer_email_service_1.OfferEmailService,
            jwt_1.JwtService,
            config_1.ConfigService,
        ],
    })
], OffersModule);
//# sourceMappingURL=offers.module.js.map