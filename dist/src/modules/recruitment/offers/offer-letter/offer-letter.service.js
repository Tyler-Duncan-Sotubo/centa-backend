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
var OfferLetterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfferLetterService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const offer_letter_templates_schema_1 = require("./schema/offer-letter-templates.schema");
const globalTemplates_1 = require("./seed/globalTemplates");
const extractHandlebarsVariables_1 = require("../../../../utils/extractHandlebarsVariables");
const offer_letter_template_variables_schema_1 = require("./schema/offer-letter-template-variables.schema");
const offer_letter_template_variable_links_schema_1 = require("./schema/offer-letter-template-variable-links.schema");
const audit_service_1 = require("../../../audit/audit.service");
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../../../common/cache/cache.service");
let OfferLetterService = OfferLetterService_1 = class OfferLetterService {
    constructor(db, auditService, logger, cache) {
        this.db = db;
        this.auditService = auditService;
        this.logger = logger;
        this.cache = cache;
        this.logger.setContext(OfferLetterService_1.name);
    }
    sysListKey() {
        return `offer:system:list`;
    }
    companyListKey(companyId) {
        return `offer:company:${companyId}:list`;
    }
    companyNamesKey(companyId) {
        return `offer:company:${companyId}:names`;
    }
    combinedKey(companyId) {
        return `offer:${companyId}:combined`;
    }
    tmplDetailKey(templateId) {
        return `offer:template:${templateId}:detail`;
    }
    async burst(opts) {
        const jobs = [];
        if (opts.system)
            jobs.push(this.cache.del(this.sysListKey()));
        if (opts.companyId) {
            jobs.push(this.cache.del(this.companyListKey(opts.companyId)));
            jobs.push(this.cache.del(this.companyNamesKey(opts.companyId)));
            jobs.push(this.cache.del(this.combinedKey(opts.companyId)));
        }
        if (opts.templateId)
            jobs.push(this.cache.del(this.tmplDetailKey(opts.templateId)));
        await Promise.allSettled(jobs);
        this.logger.debug({ ...opts }, 'cache:burst:offer');
    }
    async seedSystemOfferLetterTemplates() {
        this.logger.info({}, 'offer:seed:start');
        const existing = await this.db
            .select({ id: offer_letter_templates_schema_1.offerLetterTemplates.id })
            .from(offer_letter_templates_schema_1.offerLetterTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.isSystemTemplate, true), (0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.isDefault, true)))
            .execute();
        if (existing.length > 0) {
            this.logger.warn({}, 'offer:seed:already-exists');
            throw new common_1.BadRequestException('System offer letter templates already exist. Cannot seed again.');
        }
        for (const template of globalTemplates_1.globalTemplates) {
            const [insertedTemplate] = await this.db
                .insert(offer_letter_templates_schema_1.offerLetterTemplates)
                .values(template)
                .returning()
                .execute();
            const variables = (0, extractHandlebarsVariables_1.extractHandlebarsVariables)(template.content);
            for (const variable of variables) {
                const [existingVar] = await this.db
                    .select()
                    .from(offer_letter_template_variables_schema_1.offerLetterTemplateVariables)
                    .where((0, drizzle_orm_1.eq)(offer_letter_template_variables_schema_1.offerLetterTemplateVariables.name, variable))
                    .limit(1)
                    .execute();
                let variableId = existingVar?.id;
                if (!variableId) {
                    const [createdVar] = await this.db
                        .insert(offer_letter_template_variables_schema_1.offerLetterTemplateVariables)
                        .values({ name: variable })
                        .returning()
                        .execute();
                    variableId = createdVar.id;
                }
                await this.db
                    .insert(offer_letter_template_variable_links_schema_1.offerLetterTemplateVariableLinks)
                    .values({ templateId: insertedTemplate.id, variableId })
                    .execute();
            }
        }
        await this.burst({ system: true });
        this.logger.info({}, 'offer:seed:done');
    }
    async cloneCompanyTemplate(user, templateId) {
        const { companyId, id } = user;
        this.logger.info({ companyId, templateId }, 'offer:clone:start');
        const [template] = await this.db
            .select()
            .from(offer_letter_templates_schema_1.offerLetterTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.id, templateId), (0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.isSystemTemplate, true)))
            .execute();
        if (!template) {
            this.logger.warn({ companyId, templateId }, 'offer:clone:not-found');
            throw new common_1.BadRequestException('Template not found');
        }
        const alreadyExists = await this.db
            .select({ id: offer_letter_templates_schema_1.offerLetterTemplates.id })
            .from(offer_letter_templates_schema_1.offerLetterTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.companyId, companyId), (0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.name, template.name)))
            .execute();
        if (alreadyExists.length) {
            this.logger.warn({ companyId, name: template.name }, 'offer:clone:duplicate');
            throw new common_1.BadRequestException('This template has already been cloned.');
        }
        const [cloned] = await this.db
            .insert(offer_letter_templates_schema_1.offerLetterTemplates)
            .values({
            name: template.name,
            content: template.content,
            companyId,
            isSystemTemplate: false,
            isDefault: false,
        })
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'clone',
            entity: 'offer_letter_template',
            entityId: cloned.id,
            userId: id,
            details: `Cloned system template "${template.name}" into company "${companyId}"`,
            changes: cloned,
        });
        await this.burst({ companyId, templateId: cloned.id });
        this.logger.info({ id: cloned.id }, 'offer:clone:done');
        return cloned;
    }
    async createCompanyTemplate(user, dto) {
        const { companyId, id } = user;
        this.logger.info({ companyId, name: dto?.name }, 'offer:create:start');
        const duplicate = await this.db
            .select({ id: offer_letter_templates_schema_1.offerLetterTemplates.id })
            .from(offer_letter_templates_schema_1.offerLetterTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.companyId, companyId), (0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.name, dto.name)))
            .execute();
        if (duplicate.length) {
            this.logger.warn({ companyId, name: dto.name }, 'offer:create:duplicate');
            throw new common_1.BadRequestException('Template with this name already exists for the company');
        }
        if (dto.isDefault) {
            await this.db
                .update(offer_letter_templates_schema_1.offerLetterTemplates)
                .set({ isDefault: false })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.companyId, companyId), (0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.isDefault, true)))
                .execute();
        }
        const [template] = await this.db
            .insert(offer_letter_templates_schema_1.offerLetterTemplates)
            .values({
            name: dto.name,
            content: dto.content,
            companyId,
            isSystemTemplate: false,
            isDefault: dto.isDefault ?? false,
        })
            .returning()
            .execute();
        const vars = (0, extractHandlebarsVariables_1.extractHandlebarsVariables)(dto.content);
        for (const variableName of vars) {
            const [existingVar] = await this.db
                .select()
                .from(offer_letter_template_variables_schema_1.offerLetterTemplateVariables)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(offer_letter_template_variables_schema_1.offerLetterTemplateVariables.name, variableName), (0, drizzle_orm_1.eq)(offer_letter_template_variables_schema_1.offerLetterTemplateVariables.companyId, companyId)))
                .limit(1)
                .execute();
            let variableId;
            if (existingVar) {
                variableId = existingVar.id;
            }
            else {
                const [createdVar] = await this.db
                    .insert(offer_letter_template_variables_schema_1.offerLetterTemplateVariables)
                    .values({ name: variableName, companyId, isSystem: false })
                    .returning()
                    .execute();
                variableId = createdVar.id;
            }
            await this.db
                .insert(offer_letter_template_variable_links_schema_1.offerLetterTemplateVariableLinks)
                .values({ templateId: template.id, variableId })
                .execute();
        }
        await this.auditService.logAction({
            action: 'create',
            entity: 'offer_letter_template',
            entityId: template.id,
            userId: id,
            details: 'Created company offer-letter template',
            changes: template,
        });
        await this.burst({ companyId, templateId: template.id });
        this.logger.info({ id: template.id }, 'offer:create:done');
        return template;
    }
    async getCompanyTemplates(companyId) {
        const key = this.combinedKey(companyId);
        this.logger.debug({ key, companyId }, 'offer:getCompanyTemplates:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const [companyTemplates, systemTemplates] = await Promise.all([
                this.db
                    .select()
                    .from(offer_letter_templates_schema_1.offerLetterTemplates)
                    .where((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.companyId, companyId))
                    .execute(),
                this.db
                    .select()
                    .from(offer_letter_templates_schema_1.offerLetterTemplates)
                    .where((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.isSystemTemplate, true))
                    .execute(),
            ]);
            this.logger.debug({
                companyId,
                companyCount: companyTemplates.length,
                systemCount: systemTemplates.length,
            }, 'offer:getCompanyTemplates:db:done');
            return { companyTemplates, systemTemplates };
        });
    }
    async getCompanyOfferTemplates(companyId) {
        const key = this.companyNamesKey(companyId);
        this.logger.debug({ key, companyId }, 'offer:getCompanyOfferTemplates:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const rows = await this.db
                .select({
                id: offer_letter_templates_schema_1.offerLetterTemplates.id,
                name: offer_letter_templates_schema_1.offerLetterTemplates.name,
            })
                .from(offer_letter_templates_schema_1.offerLetterTemplates)
                .where((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.companyId, companyId))
                .execute();
            this.logger.debug({ companyId, count: rows.length }, 'offer:getCompanyOfferTemplates:db:done');
            return rows;
        });
    }
    async getTemplateById(templateId, companyId) {
        const key = this.tmplDetailKey(templateId);
        this.logger.debug({ key, templateId, companyId }, 'offer:getTemplateById:cache:get');
        const row = await this.cache.getOrSetCache(key, async () => {
            const [template] = await this.db
                .select()
                .from(offer_letter_templates_schema_1.offerLetterTemplates)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.id, templateId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.companyId, companyId), (0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.isSystemTemplate, true))))
                .execute();
            return template ?? null;
        });
        if (!row) {
            this.logger.warn({ templateId, companyId }, 'offer:getTemplateById:not-found');
            throw new common_1.BadRequestException('Template not found');
        }
        return row;
    }
    async updateTemplate(templateId, user, dto) {
        const { companyId, id } = user;
        this.logger.info({ companyId, templateId }, 'offer:update:start');
        const [existingTemplate] = await this.db
            .select({ id: offer_letter_templates_schema_1.offerLetterTemplates.id })
            .from(offer_letter_templates_schema_1.offerLetterTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.id, templateId), (0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.companyId, companyId)))
            .execute();
        if (!existingTemplate) {
            this.logger.warn({ companyId, templateId }, 'offer:update:not-found');
            throw new common_1.BadRequestException('Template not found');
        }
        if (dto.isDefault) {
            await this.db
                .update(offer_letter_templates_schema_1.offerLetterTemplates)
                .set({ isDefault: false })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.companyId, companyId), (0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.isDefault, true)))
                .execute();
        }
        const [updatedTemplate] = await this.db
            .update(offer_letter_templates_schema_1.offerLetterTemplates)
            .set({
            name: dto.name,
            content: dto.content,
            isDefault: dto.isDefault || false,
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.id, templateId), (0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.companyId, companyId)))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'offer_letter_template',
            entityId: updatedTemplate.id,
            userId: id,
            details: 'Updated offer-letter template',
            changes: dto,
        });
        await this.burst({ companyId, templateId });
        this.logger.info({ id: templateId }, 'offer:update:done');
        return updatedTemplate;
    }
    async deleteTemplate(templateId, user) {
        const { companyId, id } = user;
        this.logger.info({ companyId, templateId }, 'offer:delete:start');
        await this.db
            .delete(offer_letter_template_variable_links_schema_1.offerLetterTemplateVariableLinks)
            .where((0, drizzle_orm_1.eq)(offer_letter_template_variable_links_schema_1.offerLetterTemplateVariableLinks.templateId, templateId))
            .execute();
        const [deleted] = await this.db
            .delete(offer_letter_templates_schema_1.offerLetterTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.id, templateId), (0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.companyId, companyId)))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'offer_letter_template',
            entityId: templateId,
            userId: id,
            details: 'Deleted offer-letter template',
            changes: deleted,
        });
        await this.burst({ companyId, templateId });
        this.logger.info({ id: templateId }, 'offer:delete:done');
        return { message: 'Template deleted successfully' };
    }
};
exports.OfferLetterService = OfferLetterService;
exports.OfferLetterService = OfferLetterService = OfferLetterService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], OfferLetterService);
//# sourceMappingURL=offer-letter.service.js.map