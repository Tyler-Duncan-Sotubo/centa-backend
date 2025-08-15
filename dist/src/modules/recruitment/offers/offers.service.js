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
exports.OffersService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
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
const cache_service_1 = require("../../../common/cache/cache.service");
let OffersService = class OffersService {
    constructor(db, queue, auditService, offerLetterPdfService, cache) {
        this.db = db;
        this.queue = queue;
        this.auditService = auditService;
        this.offerLetterPdfService = offerLetterPdfService;
        this.cache = cache;
    }
    tags(scope) {
        return [
            `company:${scope}:offers`,
            `company:${scope}:offers:list`,
            `company:${scope}:offers:variables`,
        ];
    }
    async create(dto, user) {
        const { id: userId, companyId } = user;
        const { applicationId, templateId, pdfData } = dto;
        const [application] = await this.db
            .select({ candidateId: schema_1.applications.candidateId })
            .from(schema_1.applications)
            .where((0, drizzle_orm_1.eq)(schema_1.applications.id, applicationId));
        if (!application) {
            throw new common_1.BadRequestException('Application not found');
        }
        if (!templateId) {
            throw new common_1.BadRequestException('Template ID is required');
        }
        const [template] = await this.db
            .select()
            .from(offer_letter_templates_schema_1.offerLetterTemplates)
            .where((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.id, templateId));
        if (!template) {
            throw new common_1.BadRequestException('Template not found');
        }
        const requiredVars = (0, extractHandlebarsVariables_1.extractHandlebarsVariables)(template.content);
        const SIGNATURE_FIELDS = new Set([
            'sig_emp',
            'date_emp',
            'sig_cand',
            'date_cand',
        ]);
        const missingVars = requiredVars.filter((v) => !(v in pdfData) && !SIGNATURE_FIELDS.has(v));
        if (missingVars.length > 0) {
            throw new common_1.BadRequestException(`Missing template variables: ${missingVars.join(', ')}`);
        }
        const startDate = pdfData.startDate;
        const salaryRaw = pdfData.baseSalary;
        const salary = salaryRaw ? salaryRaw.toString().replace(/,/g, '') : null;
        if (salary !== null &&
            (isNaN(Number(salary)) || !isFinite(Number(salary)))) {
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
            .returning();
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
        await this.cache.bumpCompanyVersion(companyId);
        await this.cache.bumpCompanyVersion('global');
        return offer;
    }
    async getTemplateVariablesWithAutoFilledData(templateId, applicationId, user) {
        const { companyId } = user;
        const base = await this.cache.getOrSetVersioned(companyId, ['offers', 'variables', 'byTemplateApp', templateId, applicationId], async () => {
            const [template] = await this.db
                .select()
                .from(offer_letter_templates_schema_1.offerLetterTemplates)
                .where((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.id, templateId));
            if (!template) {
                throw new common_1.BadRequestException('Offer letter template not found');
            }
            const requiredVars = (0, extractHandlebarsVariables_1.extractHandlebarsVariables)(template.content);
            const [application] = await this.db
                .select({
                candidateId: schema_1.applications.candidateId,
                jobPostingId: schema_1.applications.jobId,
            })
                .from(schema_1.applications)
                .where((0, drizzle_orm_1.eq)(schema_1.applications.id, applicationId));
            if (!application) {
                throw new common_1.BadRequestException('Application not found');
            }
            const [candidate] = await this.db
                .select({
                fullName: schema_1.candidates.fullName,
                email: schema_1.candidates.email,
            })
                .from(schema_1.candidates)
                .where((0, drizzle_orm_1.eq)(schema_1.candidates.id, application.candidateId));
            if (!candidate) {
                throw new common_1.BadRequestException('Candidate not found');
            }
            const [jobPosting] = await this.db
                .select({ title: schema_1.job_postings.title })
                .from(schema_1.job_postings)
                .where((0, drizzle_orm_1.eq)(schema_1.job_postings.id, application.jobPostingId));
            if (!jobPosting) {
                throw new common_1.BadRequestException('Job posting not found');
            }
            const [company] = await this.db
                .select({
                name: schema_1.companies.name,
                address: (0, drizzle_orm_1.sql) `concat(${schema_1.companyLocations.street}, ', ', ${schema_1.companyLocations.city}, ', ', ${schema_1.companyLocations.state} || ' ', ${schema_1.companyLocations.country})`.as('address'),
                companyLogoUrl: schema_1.companies.logo_url,
                supportEmail: schema_1.companies.primaryContactEmail,
            })
                .from(schema_1.companies)
                .innerJoin(schema_1.companyLocations, (0, drizzle_orm_1.eq)(schema_1.companyLocations.companyId, schema_1.companies.id))
                .where((0, drizzle_orm_1.eq)(schema_1.companies.id, companyId));
            if (!company) {
                throw new common_1.BadRequestException('Company not found');
            }
            const fullName = candidate.fullName?.trim() || '';
            const candidateFirstName = fullName.split(' ')[0];
            const autoFilledStable = {};
            if (fullName)
                autoFilledStable.candidateFullName = fullName;
            if (candidateFirstName)
                autoFilledStable.candidateFirstName = candidateFirstName;
            if (candidate?.email)
                autoFilledStable.candidateEmail = candidate.email;
            if (company?.companyLogoUrl)
                autoFilledStable.companyLogoUrl = company.companyLogoUrl;
            if (jobPosting?.title)
                autoFilledStable.jobTitle = jobPosting.title;
            if (company?.name)
                autoFilledStable.companyName = company.name;
            if (company?.address && typeof company.address === 'string')
                autoFilledStable.companyAddress = company.address;
            if (company?.supportEmail)
                autoFilledStable.supportEmail = company.supportEmail;
            autoFilledStable.sig_cand = '_________';
            autoFilledStable.date_cand = '_________';
            autoFilledStable.sig_emp = '_________';
            autoFilledStable.date_emp = '_________';
            return {
                variables: requiredVars,
                autoFilledStable,
                templateContent: template.content,
            };
        }, { tags: this.tags(companyId) });
        const todayDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        return {
            variables: base.variables,
            autoFilled: { ...base.autoFilledStable, todayDate },
            templateContent: base.templateContent,
        };
    }
    findAll(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['offers', 'list', 'all'], async () => {
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
                .orderBy((0, drizzle_orm_1.asc)(offers_schema_1.offers.createdAt));
            return rows;
        }, { tags: this.tags(companyId) });
    }
    async getTemplateVariablesFromOffer(offerId) {
        return this.cache.getOrSetVersioned('global', ['offers', 'variables', 'fromOffer', offerId], async () => {
            const [offer] = await this.db
                .select({
                pdfData: offers_schema_1.offers.pdfData,
                templateContent: offer_letter_templates_schema_1.offerLetterTemplates.content,
            })
                .from(offers_schema_1.offers)
                .innerJoin(offer_letter_templates_schema_1.offerLetterTemplates, (0, drizzle_orm_1.eq)(offers_schema_1.offers.templateId, offer_letter_templates_schema_1.offerLetterTemplates.id))
                .where((0, drizzle_orm_1.eq)(offers_schema_1.offers.id, offerId));
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
        }, { tags: this.tags('global') });
    }
    findOne(id) {
        return `This action returns a #${id} offer`;
    }
    async update(offerId, dto, user) {
        const { id: userId, companyId } = user;
        const { pdfData } = dto;
        const [existingOffer] = await this.db
            .select({
            id: offers_schema_1.offers.id,
            templateId: offers_schema_1.offers.templateId,
            applicationId: offers_schema_1.offers.applicationId,
        })
            .from(offers_schema_1.offers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(offers_schema_1.offers.id, offerId), (0, drizzle_orm_1.eq)(offers_schema_1.offers.companyId, companyId)));
        if (!existingOffer || !existingOffer.templateId) {
            throw new common_1.BadRequestException('Offer not found or access denied');
        }
        const templateId = existingOffer.templateId;
        const [template] = await this.db
            .select()
            .from(offer_letter_templates_schema_1.offerLetterTemplates)
            .where((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.id, templateId));
        if (!template) {
            throw new common_1.BadRequestException('Template not found');
        }
        const requiredVars = (0, extractHandlebarsVariables_1.extractHandlebarsVariables)(template.content);
        const SIGNATURE_FIELDS = new Set([
            'sig_emp',
            'date_emp',
            'sig_cand',
            'date_cand',
        ]);
        if (!pdfData) {
            throw new common_1.BadRequestException('PDF data is required');
        }
        const missingVars = requiredVars.filter((v) => !(v in pdfData) && !SIGNATURE_FIELDS.has(v));
        if (missingVars.length > 0) {
            throw new common_1.BadRequestException(`Missing template variables: ${missingVars.join(', ')}`);
        }
        const startDate = pdfData?.startDate;
        const salaryRaw = pdfData?.baseSalary;
        const salary = salaryRaw ? salaryRaw.toString().replace(/,/g, '') : null;
        await this.db
            .update(offers_schema_1.offers)
            .set({
            pdfData,
            salary,
            startDate,
            updatedAt: new Date(),
            status: 'pending',
        })
            .where((0, drizzle_orm_1.eq)(offers_schema_1.offers.id, offerId));
        await this.queue.add('generate-offer-pdf', {
            templateId,
            offerId,
            candidateId: existingOffer.applicationId,
            generatedBy: userId,
            payload: pdfData,
        });
        await this.cache.bumpCompanyVersion(companyId);
        await this.cache.bumpCompanyVersion('global');
        return {
            status: 'success',
            message: 'Offer updated and queued for PDF regeneration',
        };
    }
    async sendOffer(offerId, email, user) {
        const { id, companyId } = user;
        const [offer] = await this.db
            .select()
            .from(offers_schema_1.offers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(offers_schema_1.offers.id, offerId), (0, drizzle_orm_1.eq)(offers_schema_1.offers.companyId, companyId)));
        if (!offer) {
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
        return {
            status: 'success',
            message: 'Offer sent successfully',
        };
    }
    async signOffer(dto) {
        const signedUrl = await this.offerLetterPdfService.uploadSignedOffer(dto.signedFile, dto.candidateFullName, dto.candidateId);
        await this.db
            .update(offers_schema_1.offers)
            .set({ signedLetterUrl: signedUrl, status: 'accepted' })
            .where((0, drizzle_orm_1.eq)(offers_schema_1.offers.id, dto.offerId));
        await this.cache.bumpCompanyVersion('global');
        return {
            status: 'success',
            message: 'Offer signed successfully',
        };
    }
    async moveToStage(newStageId, applicationId, user) {
        await this.db
            .update(schema_1.applications)
            .set({ currentStage: newStageId })
            .where((0, drizzle_orm_1.eq)(schema_1.applications.id, applicationId));
        await this.db.insert(schema_1.pipeline_history).values({
            applicationId,
            stageId: newStageId,
            movedAt: new Date(),
            movedBy: user.id,
        });
        await this.db.insert(schema_1.pipeline_stage_instances).values({
            applicationId,
            stageId: newStageId,
            enteredAt: new Date(),
        });
        await this.auditService.logAction({
            action: 'move_to_stage',
            entity: 'application',
            entityId: applicationId,
            userId: user.id,
            details: 'Moved to stage ' + newStageId,
            changes: { toStage: newStageId },
        });
        return { success: true };
    }
};
exports.OffersService = OffersService;
exports.OffersService = OffersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __param(1, (0, bullmq_1.InjectQueue)('offerPdfQueue')),
    __metadata("design:paramtypes", [Object, bullmq_2.Queue,
        audit_service_1.AuditService,
        offer_letter_pdf_service_1.OfferLetterPdfService,
        cache_service_1.CacheService])
], OffersService);
//# sourceMappingURL=offers.service.js.map