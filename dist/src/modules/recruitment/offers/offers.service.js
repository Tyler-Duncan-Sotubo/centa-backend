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
var OffersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OffersService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const common_2 = require("@nestjs/common");
const offers_schema_1 = require("./schema/offers.schema");
const schema_1 = require("../../../drizzle/schema");
const drizzle_orm_1 = require("drizzle-orm");
const offer_letter_templates_schema_1 = require("./offer-letter/schema/offer-letter-templates.schema");
const extractHandlebarsVariables_1 = require("../../../utils/extractHandlebarsVariables");
const audit_service_1 = require("../../audit/audit.service");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const normalizeDateFields_1 = require("../../../utils/normalizeDateFields");
const offer_letter_pdf_service_1 = require("./offer-letter/offer-letter-pdf.service");
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../../common/cache/cache.service");
let OffersService = OffersService_1 = class OffersService {
    constructor(db, queue, auditService, offerLetterPdfService, logger, cache) {
        this.db = db;
        this.queue = queue;
        this.auditService = auditService;
        this.offerLetterPdfService = offerLetterPdfService;
        this.logger = logger;
        this.cache = cache;
        this.logger.setContext(OffersService_1.name);
    }
    listKey(companyId) {
        return `offers:${companyId}:list`;
    }
    detailKey(offerId) {
        return `offers:${offerId}:detail`;
    }
    varsFromOfferKey(offerId) {
        return `offers:${offerId}:vars-from-offer`;
    }
    varsAutoKey(companyId, templateId, applicationId) {
        return `offers:${companyId}:vars:auto:${templateId}:${applicationId}`;
    }
    async burst(opts) {
        const jobs = [];
        if (opts.companyId)
            jobs.push(this.cache.del(this.listKey(opts.companyId)));
        if (opts.offerId) {
            jobs.push(this.cache.del(this.detailKey(opts.offerId)));
            jobs.push(this.cache.del(this.varsFromOfferKey(opts.offerId)));
        }
        if (opts.companyId && opts.templateId && opts.applicationId) {
            jobs.push(this.cache.del(this.varsAutoKey(opts.companyId, opts.templateId, opts.applicationId)));
        }
        await Promise.allSettled(jobs);
        this.logger.debug({ ...opts }, 'cache:burst:offers');
    }
    async create(dto, user) {
        const { id: userId, companyId } = user;
        const { applicationId, templateId, pdfData } = dto;
        this.logger.info({ companyId, applicationId, templateId }, 'offers:create:start');
        const [application] = await this.db
            .select({ candidateId: schema_1.applications.candidateId })
            .from(schema_1.applications)
            .where((0, drizzle_orm_1.eq)(schema_1.applications.id, applicationId))
            .execute();
        if (!application) {
            this.logger.warn({ companyId, applicationId }, 'offers:create:no-application');
            throw new common_1.BadRequestException('Application not found');
        }
        if (!templateId) {
            this.logger.warn({ companyId }, 'offers:create:no-templateId');
            throw new common_1.BadRequestException('Template ID is required');
        }
        const [template] = await this.db
            .select()
            .from(offer_letter_templates_schema_1.offerLetterTemplates)
            .where((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.id, templateId))
            .execute();
        if (!template) {
            this.logger.warn({ companyId, templateId }, 'offers:create:template-not-found');
            throw new common_1.BadRequestException('Template not found');
        }
        const requiredVars = (0, extractHandlebarsVariables_1.extractHandlebarsVariables)(template.content);
        const SIGNATURE_FIELDS = new Set([
            'sig_emp',
            'date_emp',
            'sig_cand',
            'date_cand',
        ]);
        const missingVars = requiredVars.filter((v) => !(v in (pdfData || {})) && !SIGNATURE_FIELDS.has(v));
        if (missingVars.length > 0) {
            this.logger.warn({ companyId, missingVars }, 'offers:create:missing-vars');
            throw new common_1.BadRequestException(`Missing template variables: ${missingVars.join(', ')}`);
        }
        const startDate = pdfData.startDate;
        const salaryRaw = pdfData.baseSalary;
        const salary = salaryRaw ? salaryRaw.toString().replace(/,/g, '') : null;
        if (salary !== null &&
            (isNaN(Number(salary)) || !isFinite(Number(salary)))) {
            this.logger.warn({ companyId, salaryRaw }, 'offers:create:invalid-salary');
            throw new common_1.BadRequestException(`Invalid salary value: "${salaryRaw}"`);
        }
        const [offer] = await this.db
            .insert(offers_schema_1.offers)
            .values({
            companyId,
            applicationId,
            templateId,
            status: 'pending',
            salary,
            startDate,
            createdBy: userId,
            pdfData,
        })
            .returning()
            .execute();
        if (offer) {
            await this.moveToStage(dto.newStageId, applicationId, user);
        }
        await this.queue.add('generate-offer-pdf', {
            templateId,
            offerId: offer.id,
            candidateId: application.candidateId,
            generatedBy: userId,
            payload: pdfData,
        });
        await this.auditService.logAction({
            action: 'create',
            entity: 'offer',
            entityId: offer.id,
            userId: userId,
            details: 'Offer created and PDF generation queued',
            changes: { applicationId, templateId, salary, startDate },
        });
        await this.burst({ companyId });
        this.logger.info({ id: offer.id }, 'offers:create:done');
        return offer;
    }
    async getTemplateVariablesWithAutoFilledData(templateId, applicationId, user) {
        const { companyId } = user;
        const key = this.varsAutoKey(companyId, templateId, applicationId);
        this.logger.debug({ key, companyId, templateId, applicationId }, 'offers:autoVars:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const [template] = await this.db
                .select()
                .from(offer_letter_templates_schema_1.offerLetterTemplates)
                .where((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.id, templateId))
                .execute();
            if (!template)
                throw new common_1.BadRequestException('Offer letter template not found');
            const requiredVars = (0, extractHandlebarsVariables_1.extractHandlebarsVariables)(template.content);
            const [application] = await this.db
                .select({
                candidateId: schema_1.applications.candidateId,
                jobPostingId: schema_1.applications.jobId,
            })
                .from(schema_1.applications)
                .where((0, drizzle_orm_1.eq)(schema_1.applications.id, applicationId))
                .execute();
            if (!application)
                throw new common_1.BadRequestException('Application not found');
            const [candidate] = await this.db
                .select({ fullName: schema_1.candidates.fullName, email: schema_1.candidates.email })
                .from(schema_1.candidates)
                .where((0, drizzle_orm_1.eq)(schema_1.candidates.id, application.candidateId))
                .execute();
            if (!candidate)
                throw new common_1.BadRequestException('Candidate not found');
            const [jobPosting] = await this.db
                .select({ title: schema_1.job_postings.title })
                .from(schema_1.job_postings)
                .where((0, drizzle_orm_1.eq)(schema_1.job_postings.id, application.jobPostingId))
                .execute();
            if (!jobPosting)
                throw new common_1.BadRequestException('Job posting not found');
            const [company] = await this.db
                .select({
                name: schema_1.companies.name,
                address: (0, drizzle_orm_1.sql) `concat(${schema_1.companyLocations.street}, ', ', ${schema_1.companyLocations.city}, ', ', ${schema_1.companyLocations.state} || ' ', ${schema_1.companyLocations.country})`.as('address'),
                companyLogoUrl: schema_1.companies.logo_url,
                supportEmail: schema_1.companies.primaryContactEmail,
            })
                .from(schema_1.companies)
                .innerJoin(schema_1.companyLocations, (0, drizzle_orm_1.eq)(schema_1.companyLocations.companyId, schema_1.companies.id))
                .where((0, drizzle_orm_1.eq)(schema_1.companies.id, companyId))
                .execute();
            if (!company)
                throw new common_1.BadRequestException('Company not found');
            const fullName = candidate.fullName?.trim() || '';
            const candidateFirstName = fullName.split(' ')[0];
            const autoFilled = {};
            if (fullName)
                autoFilled.candidateFullName = fullName;
            if (candidateFirstName)
                autoFilled.candidateFirstName = candidateFirstName;
            if (candidate?.email)
                autoFilled.candidateEmail = candidate.email;
            if (company?.companyLogoUrl)
                autoFilled.companyLogoUrl = company.companyLogoUrl;
            if (jobPosting?.title)
                autoFilled.jobTitle = jobPosting.title;
            if (company?.name)
                autoFilled.companyName = company.name;
            if (company?.address && typeof company.address === 'string')
                autoFilled.companyAddress = company.address;
            if (company?.supportEmail)
                autoFilled.supportEmail = company.supportEmail;
            autoFilled.todayDate = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
            autoFilled.sig_cand = '_________';
            autoFilled.date_cand = '_________';
            autoFilled.sig_emp = '_________';
            autoFilled.date_emp = '_________';
            const payload = {
                variables: requiredVars,
                autoFilled,
                templateContent: template.content,
            };
            this.logger.debug({ companyId, count: requiredVars.length }, 'offers:autoVars:db:done');
            return payload;
        });
    }
    findAll(companyId) {
        const key = this.listKey(companyId);
        this.logger.debug({ key, companyId }, 'offers:list:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const rows = await this.db
                .select({
                id: offers_schema_1.offers.id,
                applicationId: offers_schema_1.offers.applicationId,
                templateId: offers_schema_1.offers.templateId,
                status: offers_schema_1.offers.status,
                salary: offers_schema_1.offers.salary,
                sentAt: offers_schema_1.offers.sentAt,
                startDate: offers_schema_1.offers.startDate,
                candidateFullName: schema_1.candidates.fullName,
                candidateEmail: schema_1.candidates.email,
                jobTitle: schema_1.job_postings.title,
                letterUrl: offers_schema_1.offers.letterUrl,
                signedLetterUrl: offers_schema_1.offers.signedLetterUrl,
            })
                .from(offers_schema_1.offers)
                .innerJoin(schema_1.applications, (0, drizzle_orm_1.eq)(schema_1.applications.id, offers_schema_1.offers.applicationId))
                .innerJoin(schema_1.job_postings, (0, drizzle_orm_1.eq)(schema_1.job_postings.id, schema_1.applications.jobId))
                .innerJoin(schema_1.candidates, (0, drizzle_orm_1.eq)(schema_1.candidates.id, schema_1.applications.candidateId))
                .where((0, drizzle_orm_1.eq)(offers_schema_1.offers.companyId, companyId))
                .execute();
            this.logger.debug({ companyId, count: rows.length }, 'offers:list:db:done');
            return rows;
        });
    }
    async getTemplateVariablesFromOffer(offerId) {
        const key = this.varsFromOfferKey(offerId);
        this.logger.debug({ key, offerId }, 'offers:varsFromOffer:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const [offer] = await this.db
                .select({
                pdfData: offers_schema_1.offers.pdfData,
                templateContent: offer_letter_templates_schema_1.offerLetterTemplates.content,
            })
                .from(offers_schema_1.offers)
                .innerJoin(offer_letter_templates_schema_1.offerLetterTemplates, (0, drizzle_orm_1.eq)(offers_schema_1.offers.templateId, offer_letter_templates_schema_1.offerLetterTemplates.id))
                .where((0, drizzle_orm_1.eq)(offers_schema_1.offers.id, offerId))
                .execute();
            if (!offer) {
                throw new common_1.BadRequestException('Offer not found');
            }
            const requiredVars = (0, extractHandlebarsVariables_1.extractHandlebarsVariables)(offer.templateContent);
            const cleanedPdfData = (0, normalizeDateFields_1.normalizeDateFields)(offer.pdfData);
            return {
                variables: requiredVars,
                autoFilled: cleanedPdfData || {},
                templateContent: offer.templateContent,
            };
        });
    }
    findOne(id) {
        return `This action returns a #${id} offer`;
    }
    async update(offerId, dto, user) {
        const { id: userId, companyId } = user;
        this.logger.info({ companyId, offerId }, 'offers:update:start');
        const [existingOffer] = await this.db
            .select({
            id: offers_schema_1.offers.id,
            templateId: offers_schema_1.offers.templateId,
            applicationId: offers_schema_1.offers.applicationId,
        })
            .from(offers_schema_1.offers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(offers_schema_1.offers.id, offerId), (0, drizzle_orm_1.eq)(offers_schema_1.offers.companyId, companyId)))
            .execute();
        if (!existingOffer || !existingOffer.templateId) {
            this.logger.warn({ companyId, offerId }, 'offers:update:not-found');
            throw new common_1.BadRequestException('Offer not found or access denied');
        }
        const templateId = existingOffer.templateId;
        const [template] = await this.db
            .select()
            .from(offer_letter_templates_schema_1.offerLetterTemplates)
            .where((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.id, templateId))
            .execute();
        if (!template) {
            this.logger.warn({ templateId }, 'offers:update:template-not-found');
            throw new common_1.BadRequestException('Template not found');
        }
        const requiredVars = (0, extractHandlebarsVariables_1.extractHandlebarsVariables)(template.content);
        const SIGNATURE_FIELDS = new Set([
            'sig_emp',
            'date_emp',
            'sig_cand',
            'date_cand',
        ]);
        if (!dto.pdfData) {
            this.logger.warn({ offerId }, 'offers:update:no-pdfData');
            throw new common_1.BadRequestException('PDF data is required');
        }
        const missingVars = requiredVars.filter((v) => !(v in (dto.pdfData ?? {})) && !SIGNATURE_FIELDS.has(v));
        if (missingVars.length > 0) {
            this.logger.warn({ offerId, missingVars }, 'offers:update:missing-vars');
            throw new common_1.BadRequestException(`Missing template variables: ${missingVars.join(', ')}`);
        }
        const startDate = dto.pdfData?.startDate;
        const salaryRaw = dto.pdfData?.baseSalary;
        const salary = salaryRaw ? salaryRaw.toString().replace(/,/g, '') : null;
        await this.db
            .update(offers_schema_1.offers)
            .set({
            pdfData: dto.pdfData,
            salary,
            startDate,
            updatedAt: new Date(),
            status: 'pending',
        })
            .where((0, drizzle_orm_1.eq)(offers_schema_1.offers.id, offerId))
            .execute();
        await this.queue.add('generate-offer-pdf', {
            templateId,
            offerId,
            candidateId: existingOffer.applicationId,
            generatedBy: userId,
            payload: dto.pdfData,
        });
        await this.auditService.logAction({
            action: 'update',
            entity: 'offer',
            entityId: offerId,
            userId: userId,
            details: 'Offer updated and PDF regeneration queued',
            changes: { startDate, salary },
        });
        await this.burst({
            companyId,
            offerId,
            templateId,
            applicationId: existingOffer.applicationId,
        });
        this.logger.info({ id: offerId }, 'offers:update:done');
        return {
            status: 'success',
            message: 'Offer updated and queued for PDF regeneration',
        };
    }
    async sendOffer(offerId, email, user) {
        const { id, companyId } = user;
        this.logger.info({ companyId, offerId, email }, 'offers:send:start');
        const [offer] = await this.db
            .select()
            .from(offers_schema_1.offers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(offers_schema_1.offers.id, offerId), (0, drizzle_orm_1.eq)(offers_schema_1.offers.companyId, companyId)))
            .execute();
        if (!offer) {
            this.logger.warn({ companyId, offerId }, 'offers:send:not-found');
            throw new common_1.BadRequestException('Offer not found or access denied');
        }
        await this.auditService.logAction({
            action: 'send',
            entity: 'offer',
            entityId: offerId,
            userId: id,
            details: 'Offer sent',
            changes: {},
        });
        await this.burst({ companyId, offerId });
        this.logger.info({ offerId }, 'offers:send:done');
        return { status: 'success', message: 'Offer sent successfully' };
    }
    async signOffer(dto) {
        this.logger.info({ offerId: dto.offerId, candidateId: dto.candidateId }, 'offers:sign:start');
        const signedUrl = await this.offerLetterPdfService.uploadSignedOffer(dto.signedFile, dto.candidateFullName, dto.candidateId);
        await this.db
            .update(offers_schema_1.offers)
            .set({ signedLetterUrl: signedUrl, status: 'accepted' })
            .where((0, drizzle_orm_1.eq)(offers_schema_1.offers.id, dto.offerId))
            .execute();
        await this.auditService.logAction({
            action: 'sign',
            entity: 'offer',
            entityId: dto.offerId,
            userId: dto.candidateId,
            details: 'Offer signed',
            changes: { signedLetterUrl: signedUrl },
        });
        await this.burst({ offerId: dto.offerId });
        this.logger.info({ offerId: dto.offerId }, 'offers:sign:done');
        return { status: 'success', message: 'Offer signed successfully' };
    }
    async moveToStage(newStageId, applicationId, user) {
        this.logger.info({ applicationId, newStageId, userId: user.id }, 'offers:moveToStage:start');
        await this.db
            .update(schema_1.applications)
            .set({ currentStage: newStageId })
            .where((0, drizzle_orm_1.eq)(schema_1.applications.id, applicationId))
            .execute();
        await this.db
            .insert(schema_1.pipeline_history)
            .values({
            applicationId,
            stageId: newStageId,
            movedAt: new Date(),
            movedBy: user.id,
        })
            .execute();
        await this.db
            .insert(schema_1.pipeline_stage_instances)
            .values({ applicationId, stageId: newStageId, enteredAt: new Date() })
            .execute();
        await this.auditService.logAction({
            action: 'move_to_stage',
            entity: 'application',
            entityId: applicationId,
            userId: user.id,
            details: 'Moved to stage ' + newStageId,
            changes: { toStage: newStageId },
        });
        this.logger.info({ applicationId, newStageId }, 'offers:moveToStage:done');
        return { success: true };
    }
};
exports.OffersService = OffersService;
exports.OffersService = OffersService = OffersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __param(1, (0, bullmq_1.InjectQueue)('offerPdfQueue')),
    __metadata("design:paramtypes", [Object, bullmq_2.Queue,
        audit_service_1.AuditService,
        offer_letter_pdf_service_1.OfferLetterPdfService,
        nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], OffersService);
//# sourceMappingURL=offers.service.js.map