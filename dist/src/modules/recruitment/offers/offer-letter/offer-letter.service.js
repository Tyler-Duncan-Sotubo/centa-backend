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
const cache_service_1 = require("../../../../common/cache/cache.service");
let OfferLetterService = class OfferLetterService {
    constructor(db, auditService, cache) {
        this.db = db;
        this.auditService = auditService;
        this.cache = cache;
    }
    tags(scope) {
        return [`company:${scope}:offers`, `company:${scope}:offers:templates`];
    }
    async seedSystemOfferLetterTemplates() {
        const existing = await this.db
            .select()
            .from(offer_letter_templates_schema_1.offerLetterTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.isSystemTemplate, true), (0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.isDefault, true)))
            .execute();
        if (existing.length > 0) {
            throw new common_1.BadRequestException('System offer letter templates already exist. Cannot seed again.');
        }
        for (const template of globalTemplates_1.globalTemplates) {
            const [insertedTemplate] = await this.db
                .insert(offer_letter_templates_schema_1.offerLetterTemplates)
                .values(template)
                .returning();
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
                        .returning();
                    variableId = createdVar.id;
                }
                await this.db.insert(offer_letter_template_variable_links_schema_1.offerLetterTemplateVariableLinks).values({
                    templateId: insertedTemplate.id,
                    variableId,
                });
            }
        }
        await this.cache.bumpCompanyVersion('global');
    }
    async cloneCompanyTemplate(user, templateId) {
        const { companyId, id } = user;
        const [template] = await this.db
            .select()
            .from(offer_letter_templates_schema_1.offerLetterTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.id, templateId), (0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.isSystemTemplate, true)))
            .execute();
        if (!template) {
            throw new common_1.BadRequestException('Template not found');
        }
        const alreadyExists = await this.db
            .select()
            .from(offer_letter_templates_schema_1.offerLetterTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.companyId, companyId), (0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.name, template.name)))
            .execute();
        if (alreadyExists.length) {
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
            .returning();
        await this.auditService.logAction({
            action: 'clone',
            entity: 'offer_letter_template',
            entityId: cloned.id,
            userId: id,
            details: `Cloned system template "${template.name}" into company "${companyId}"`,
            changes: cloned,
        });
        await this.cache.bumpCompanyVersion(companyId);
        return cloned;
    }
    async createCompanyTemplate(user, dto) {
        const { companyId, id } = user;
        const duplicate = await this.db
            .select()
            .from(offer_letter_templates_schema_1.offerLetterTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.companyId, companyId), (0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.name, dto.name)))
            .execute();
        if (duplicate.length) {
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
            .returning();
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
                    .values({
                    name: variableName,
                    companyId,
                    isSystem: false,
                })
                    .returning();
                variableId = createdVar.id;
            }
            await this.db.insert(offer_letter_template_variable_links_schema_1.offerLetterTemplateVariableLinks).values({
                templateId: template.id,
                variableId,
            });
        }
        await this.auditService.logAction({
            action: 'create',
            entity: 'offer_letter_template',
            entityId: template.id,
            userId: id,
            details: 'Created company offer-letter template',
            changes: template,
        });
        await this.cache.bumpCompanyVersion(companyId);
        return template;
    }
    async getCompanyTemplates(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['offers', 'templates', 'all'], async () => {
            const [companyTemplates, systemTemplates] = await Promise.all([
                this.db
                    .select()
                    .from(offer_letter_templates_schema_1.offerLetterTemplates)
                    .where((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.companyId, companyId))
                    .orderBy((0, drizzle_orm_1.asc)(offer_letter_templates_schema_1.offerLetterTemplates.name))
                    .execute(),
                this.db
                    .select()
                    .from(offer_letter_templates_schema_1.offerLetterTemplates)
                    .where((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.isSystemTemplate, true))
                    .orderBy((0, drizzle_orm_1.asc)(offer_letter_templates_schema_1.offerLetterTemplates.name))
                    .execute(),
            ]);
            return { companyTemplates, systemTemplates };
        }, {
            tags: [...this.tags(companyId), ...this.tags('global')],
        });
    }
    async getCompanyOfferTemplates(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['offers', 'templates', 'companyList'], async () => {
            const companyTemplates = await this.db
                .select({
                id: offer_letter_templates_schema_1.offerLetterTemplates.id,
                name: offer_letter_templates_schema_1.offerLetterTemplates.name,
            })
                .from(offer_letter_templates_schema_1.offerLetterTemplates)
                .where((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.companyId, companyId))
                .orderBy((0, drizzle_orm_1.asc)(offer_letter_templates_schema_1.offerLetterTemplates.name))
                .execute();
            return companyTemplates;
        }, { tags: this.tags(companyId) });
    }
    async getTemplateById(templateId, companyId) {
        return this.cache.getOrSetVersioned(companyId, ['offers', 'templates', 'detail', templateId], async () => {
            const [template] = await this.db
                .select()
                .from(offer_letter_templates_schema_1.offerLetterTemplates)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.id, templateId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.companyId, companyId), (0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.isSystemTemplate, true))))
                .execute();
            if (!template) {
                throw new common_1.BadRequestException('Template not found');
            }
            return template;
        }, {
            tags: [...this.tags(companyId), ...this.tags('global')],
        });
    }
    async updateTemplate(templateId, user, dto) {
        const { companyId, id } = user;
        const [existingTemplate] = await this.db
            .select()
            .from(offer_letter_templates_schema_1.offerLetterTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.id, templateId), (0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.companyId, companyId)))
            .execute();
        if (!existingTemplate) {
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
            .returning();
        await this.auditService.logAction({
            action: 'update',
            entity: 'offer_letter_template',
            entityId: updatedTemplate.id,
            userId: id,
            details: 'Updated offer-letter template',
            changes: dto,
        });
        await this.cache.bumpCompanyVersion(companyId);
        return updatedTemplate;
    }
    async deleteTemplate(templateId, user) {
        const { companyId, id } = user;
        await this.db
            .delete(offer_letter_template_variable_links_schema_1.offerLetterTemplateVariableLinks)
            .where((0, drizzle_orm_1.eq)(offer_letter_template_variable_links_schema_1.offerLetterTemplateVariableLinks.templateId, templateId))
            .execute();
        const [deleted] = await this.db
            .delete(offer_letter_templates_schema_1.offerLetterTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.id, templateId), (0, drizzle_orm_1.eq)(offer_letter_templates_schema_1.offerLetterTemplates.companyId, companyId)))
            .returning();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'offer_letter_template',
            entityId: templateId,
            userId: id,
            details: 'Deleted offer-letter template',
            changes: deleted,
        });
        await this.cache.bumpCompanyVersion(companyId);
        return { message: 'Template deleted successfully' };
    }
};
exports.OfferLetterService = OfferLetterService;
exports.OfferLetterService = OfferLetterService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        cache_service_1.CacheService])
], OfferLetterService);
//# sourceMappingURL=offer-letter.service.js.map