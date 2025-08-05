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
exports.SendOffersService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const common_2 = require("@nestjs/common");
const offers_schema_1 = require("./schema/offers.schema");
const drizzle_orm_1 = require("drizzle-orm");
const audit_service_1 = require("../../audit/audit.service");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const offer_email_service_1 = require("../../notification/services/offer-email.service");
const schema_1 = require("../../../drizzle/schema");
let SendOffersService = class SendOffersService {
    constructor(db, auditService, jwtService, configService, offerEmailService) {
        this.db = db;
        this.auditService = auditService;
        this.jwtService = jwtService;
        this.configService = configService;
        this.offerEmailService = offerEmailService;
    }
    signToken(payload) {
        return this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_SECRET'),
            expiresIn: `${this.configService.get('OFFER_TOKEN_EXPIRATION', 604800)}s`,
        });
    }
    verifyToken(token) {
        try {
            return this.jwtService.verify(token, {
                secret: this.configService.get('JWT_SECRET'),
            });
        }
        catch (err) {
            console.error('Invalid offer token:', err);
            throw new common_1.UnauthorizedException('Invalid or expired offer token');
        }
    }
    async fetchOffer(offerId, email) {
        const [offer] = await this.db
            .select({
            id: offers_schema_1.offers.id,
            companyId: offers_schema_1.offers.companyId,
            createdAt: offers_schema_1.offers.createdAt,
            updatedAt: offers_schema_1.offers.updatedAt,
            companyName: schema_1.companies.name,
            jobTitle: schema_1.job_postings.title,
            candidateName: schema_1.candidates.fullName,
            candidateId: schema_1.candidates.id,
            companyLogo: schema_1.companies.logo_url,
            letterUrl: offers_schema_1.offers.letterUrl,
            status: offers_schema_1.offers.status,
        })
            .from(offers_schema_1.offers)
            .innerJoin(schema_1.applications, (0, drizzle_orm_1.eq)(schema_1.applications.id, offers_schema_1.offers.applicationId))
            .innerJoin(schema_1.job_postings, (0, drizzle_orm_1.eq)(schema_1.job_postings.id, schema_1.applications.jobId))
            .innerJoin(schema_1.candidates, (0, drizzle_orm_1.eq)(schema_1.candidates.id, schema_1.applications.candidateId))
            .innerJoin(schema_1.companies, (0, drizzle_orm_1.eq)(schema_1.companies.id, offers_schema_1.offers.companyId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(offers_schema_1.offers.id, offerId), (0, drizzle_orm_1.eq)(schema_1.candidates.email, email)));
        if (!offer) {
            throw new common_1.BadRequestException('Offer not found or access denied');
        }
        return offer;
    }
    async getOfferFromToken(token) {
        const { offerId, email } = this.verifyToken(token);
        const offer = await this.fetchOffer(offerId, email);
        return offer;
    }
    async sendOffer(offerId, email, user) {
        const { id, companyId } = user;
        const [offer] = await this.db
            .select({
            id: offers_schema_1.offers.id,
            companyId: offers_schema_1.offers.companyId,
            createdAt: offers_schema_1.offers.createdAt,
            updatedAt: offers_schema_1.offers.updatedAt,
            companyName: schema_1.companies.name,
            jobTitle: schema_1.job_postings.title,
            candidateName: schema_1.candidates.fullName,
            companyLogo: schema_1.companies.logo_url,
        })
            .from(offers_schema_1.offers)
            .innerJoin(schema_1.applications, (0, drizzle_orm_1.eq)(schema_1.applications.id, offers_schema_1.offers.applicationId))
            .innerJoin(schema_1.job_postings, (0, drizzle_orm_1.eq)(schema_1.job_postings.id, schema_1.applications.jobId))
            .innerJoin(schema_1.candidates, (0, drizzle_orm_1.eq)(schema_1.candidates.id, schema_1.applications.candidateId))
            .innerJoin(schema_1.companies, (0, drizzle_orm_1.eq)(schema_1.companies.id, offers_schema_1.offers.companyId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(offers_schema_1.offers.id, offerId), (0, drizzle_orm_1.eq)(offers_schema_1.offers.companyId, companyId)));
        if (!offer) {
            throw new common_1.BadRequestException('Offer not found or access denied');
        }
        const token = this.signToken({ offerId, email });
        const offerUrl = `${this.configService.get('CAREER_URL')}/offer/${token}`;
        await this.offerEmailService.sendOfferEmail(email, offer.candidateName, offer.jobTitle, offer.companyName, offerUrl, offer.companyLogo || 'https://centahr.com/logo.png');
        await this.db
            .update(offers_schema_1.offers)
            .set({ sentAt: new Date(), updatedAt: new Date(), status: 'sent' })
            .where((0, drizzle_orm_1.eq)(offers_schema_1.offers.id, offerId));
        await this.auditService.logAction({
            action: 'send',
            entity: 'offer',
            entityId: offerId,
            userId: id,
            details: 'Offer sent',
            changes: {},
        });
        return {
            status: 'success',
            message: 'Offer sent successfully',
        };
    }
};
exports.SendOffersService = SendOffersService;
exports.SendOffersService = SendOffersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        jwt_1.JwtService,
        config_1.ConfigService,
        offer_email_service_1.OfferEmailService])
], SendOffersService);
//# sourceMappingURL=send-offer.service.js.map