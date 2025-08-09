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
var ScorecardTemplateService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScorecardTemplateService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const audit_service_1 = require("../../audit/audit.service");
const schema_1 = require("../schema");
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../../common/cache/cache.service");
let ScorecardTemplateService = ScorecardTemplateService_1 = class ScorecardTemplateService {
    constructor(db, auditService, logger, cache) {
        this.db = db;
        this.auditService = auditService;
        this.logger = logger;
        this.cache = cache;
        this.logger.setContext(ScorecardTemplateService_1.name);
    }
    listKey(companyId) {
        return `scorecard:${companyId}:templates:list`;
    }
    detailKey(templateId) {
        return `scorecard:template:${templateId}:detail+criteria`;
    }
    async burst(opts) {
        const jobs = [];
        if (opts.companyId)
            jobs.push(this.cache.del(this.listKey(opts.companyId)));
        if (opts.templateId)
            jobs.push(this.cache.del(this.detailKey(opts.templateId)));
        await Promise.allSettled(jobs);
        this.logger.debug({ ...opts }, 'cache:burst:scorecard');
    }
    async getAllTemplates(companyId) {
        const key = this.listKey(companyId);
        this.logger.debug({ key, companyId }, 'scorecard:list:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const rows = await this.db
                .select({
                id: schema_1.scorecard_templates.id,
                name: schema_1.scorecard_templates.name,
                description: schema_1.scorecard_templates.description,
                isSystem: schema_1.scorecard_templates.isSystem,
                createdAt: schema_1.scorecard_templates.createdAt,
                criteria: (0, drizzle_orm_1.sql) `json_agg(json_build_object(
            'id', ${schema_1.scorecard_criteria.id},
            'name', ${schema_1.scorecard_criteria.label},
            'maxScore', ${schema_1.scorecard_criteria.maxScore},
            'description', ${schema_1.scorecard_criteria.description}
          ) ORDER BY ${schema_1.scorecard_criteria.order})`.as('criteria'),
            })
                .from(schema_1.scorecard_templates)
                .leftJoin(schema_1.scorecard_criteria, (0, drizzle_orm_1.eq)(schema_1.scorecard_templates.id, schema_1.scorecard_criteria.templateId))
                .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(schema_1.scorecard_templates.companyId), (0, drizzle_orm_1.eq)(schema_1.scorecard_templates.companyId, companyId)))
                .groupBy(schema_1.scorecard_templates.id)
                .orderBy((0, drizzle_orm_1.asc)(schema_1.scorecard_templates.createdAt))
                .execute();
            this.logger.debug({ companyId, count: rows.length }, 'scorecard:list:db:done');
            return rows;
        });
    }
    async getTemplateWithCriteria(templateId, companyId) {
        const key = this.detailKey(templateId);
        this.logger.debug({ key, templateId }, 'scorecard:detail:cache:get');
        const payload = await this.cache.getOrSetCache(key, async () => {
            const [tmpl] = await this.db
                .select()
                .from(schema_1.scorecard_templates)
                .where(companyId
                ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.scorecard_templates.id, templateId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(schema_1.scorecard_templates.companyId), (0, drizzle_orm_1.eq)(schema_1.scorecard_templates.companyId, companyId)))
                : (0, drizzle_orm_1.eq)(schema_1.scorecard_templates.id, templateId))
                .execute();
            if (!tmpl)
                return null;
            const criteria = await this.db
                .select({
                id: schema_1.scorecard_criteria.id,
                label: schema_1.scorecard_criteria.label,
                description: schema_1.scorecard_criteria.description,
                maxScore: schema_1.scorecard_criteria.maxScore,
                order: schema_1.scorecard_criteria.order,
            })
                .from(schema_1.scorecard_criteria)
                .where((0, drizzle_orm_1.eq)(schema_1.scorecard_criteria.templateId, templateId))
                .orderBy((0, drizzle_orm_1.asc)(schema_1.scorecard_criteria.order))
                .execute();
            return { ...tmpl, criteria };
        });
        if (!payload) {
            this.logger.warn({ templateId }, 'scorecard:detail:not-found');
            throw new common_1.NotFoundException('Template not found');
        }
        return payload;
    }
    async create(user, dto) {
        const { companyId, id } = user;
        this.logger.info({ companyId, name: dto?.name }, 'scorecard:create:start');
        const [template] = await this.db
            .insert(schema_1.scorecard_templates)
            .values({
            name: dto.name,
            description: dto.description,
            companyId,
            isSystem: false,
        })
            .returning()
            .execute();
        const criteria = (dto.criteria ?? []).map((c, index) => ({
            templateId: template.id,
            label: c.label,
            description: c.description,
            maxScore: c.maxScore,
            order: index + 1,
        }));
        if (criteria.length) {
            await this.db.insert(schema_1.scorecard_criteria).values(criteria).execute();
        }
        await this.auditService.logAction({
            action: 'create',
            entity: 'scorecard_template',
            entityId: template.id,
            userId: id,
            details: 'Created scorecard template',
            changes: {
                name: template.name,
                description: template.description,
                criteria: criteria.map((c) => ({
                    label: c.label,
                    description: c.description,
                    maxScore: c.maxScore,
                    order: c.order,
                })),
            },
        });
        await this.burst({ companyId, templateId: template.id });
        this.logger.info({ id: template.id }, 'scorecard:create:done');
        return template;
    }
    async cloneTemplate(templateId, user) {
        const { companyId, id } = user;
        this.logger.info({ companyId, templateId }, 'scorecard:clone:start');
        const cloned = await this.db.transaction(async (trx) => {
            const [template] = await trx
                .select()
                .from(schema_1.scorecard_templates)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.scorecard_templates.id, templateId), (0, drizzle_orm_1.isNull)(schema_1.scorecard_templates.companyId)))
                .execute();
            if (!template) {
                this.logger.warn({ templateId }, 'scorecard:clone:not-found');
                throw new common_1.NotFoundException('System template not found');
            }
            const targetName = `${template.name} (Copy)`;
            const [dup] = await trx
                .select({ id: schema_1.scorecard_templates.id })
                .from(schema_1.scorecard_templates)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.scorecard_templates.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.scorecard_templates.name, targetName)))
                .limit(1)
                .execute();
            if (dup) {
                this.logger.warn({ companyId, templateId, name: targetName }, 'scorecard:clone:duplicate');
                throw new common_1.BadRequestException('This template has already been cloned for your company.');
            }
            const criteria = await trx
                .select({
                label: schema_1.scorecard_criteria.label,
                description: schema_1.scorecard_criteria.description,
                maxScore: schema_1.scorecard_criteria.maxScore,
                order: schema_1.scorecard_criteria.order,
            })
                .from(schema_1.scorecard_criteria)
                .where((0, drizzle_orm_1.eq)(schema_1.scorecard_criteria.templateId, templateId))
                .orderBy(schema_1.scorecard_criteria.order)
                .execute();
            const [newTpl] = await trx
                .insert(schema_1.scorecard_templates)
                .values({
                name: targetName,
                description: template.description,
                companyId,
                isSystem: false,
            })
                .returning()
                .execute();
            if (criteria.length) {
                await trx
                    .insert(schema_1.scorecard_criteria)
                    .values(criteria.map((c) => ({
                    templateId: newTpl.id,
                    label: c.label,
                    description: c.description,
                    maxScore: c.maxScore,
                    order: c.order,
                })))
                    .execute();
            }
            await this.auditService.logAction({
                action: 'clone',
                entity: 'scorecard_template',
                entityId: newTpl.id,
                userId: id,
                details: 'Cloned scorecard template (with criteria)',
                changes: {
                    name: newTpl.name,
                    description: newTpl.description,
                    criteriaCloned: criteria.length,
                },
            });
            return newTpl;
        });
        await this.burst({ companyId, templateId: cloned.id });
        this.logger.info({ id: cloned.id }, 'scorecard:clone:done');
        return cloned;
    }
    async seedSystemTemplates() {
        this.logger.info({}, 'scorecard:seed:start');
        const templates = [
            {
                name: 'General Screening',
                description: 'Initial evaluation for overall candidate fit',
                criteria: [
                    {
                        label: 'Communication Skills',
                        description: 'Verbal and written clarity',
                    },
                    {
                        label: 'Confidence & Poise',
                        description: 'Professional demeanor and composure',
                    },
                    {
                        label: 'Motivation & Interest',
                        description: 'Genuine interest in the role and company',
                    },
                ],
            },
            {
                name: 'Technical Interview (Engineering)',
                description: 'Evaluate technical ability and problem-solving',
                criteria: [
                    {
                        label: 'Problem Solving',
                        description: 'Ability to break down complex challenges',
                    },
                    {
                        label: 'Coding Proficiency',
                        description: 'Clean, efficient, and correct code',
                    },
                    {
                        label: 'Technical Communication',
                        description: 'Explains ideas and decisions well',
                    },
                ],
            },
            {
                name: 'Culture Fit',
                description: 'Assess alignment with company values and culture',
                criteria: [
                    {
                        label: 'Team Collaboration',
                        description: 'Works well with others',
                    },
                    {
                        label: 'Adaptability',
                        description: 'Adjusts to change and ambiguity',
                    },
                    {
                        label: 'Alignment with Company Values',
                        description: 'Embodies core principles',
                    },
                ],
            },
            {
                name: 'Leadership Evaluation',
                description: 'For team lead or managerial roles',
                criteria: [
                    {
                        label: 'Decision-Making',
                        description: 'Judges situations and takes ownership',
                    },
                    {
                        label: 'Team Management',
                        description: 'Leads and motivates team effectively',
                    },
                    {
                        label: 'Strategic Thinking',
                        description: 'Plans long-term and thinks big-picture',
                    },
                ],
            },
            {
                name: 'Internship Screening',
                description: 'Evaluate learning potential in early-career candidates',
                criteria: [
                    {
                        label: 'Learning Ability',
                        description: 'Quick to grasp new concepts',
                    },
                    {
                        label: 'Enthusiasm',
                        description: 'Shows energy and eagerness to learn',
                    },
                    {
                        label: 'Basic Technical Knowledge',
                        description: 'Understands core concepts',
                    },
                ],
            },
        ];
        for (const tmpl of templates) {
            const [template] = await this.db
                .insert(schema_1.scorecard_templates)
                .values({
                name: tmpl.name,
                description: tmpl.description,
                isSystem: true,
            })
                .returning()
                .execute();
            const criteria = tmpl.criteria.map((c, index) => ({
                templateId: template.id,
                label: c.label,
                description: c.description,
                maxScore: 5,
                order: index + 1,
            }));
            await this.db.insert(schema_1.scorecard_criteria).values(criteria).execute();
        }
        await this.burst({});
        this.logger.info({}, 'scorecard:seed:done');
        return { success: true };
    }
    async deleteTemplate(templateId, user) {
        const { companyId, id } = user;
        this.logger.info({ companyId, templateId }, 'scorecard:delete:start');
        const template = await this.db.query.scorecard_templates.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.scorecard_templates.id, templateId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(schema_1.scorecard_templates.companyId), (0, drizzle_orm_1.eq)(schema_1.scorecard_templates.companyId, companyId))),
        });
        if (!template) {
            this.logger.warn({ templateId }, 'scorecard:delete:not-found');
            throw new common_1.NotFoundException(`Template not found`);
        }
        if (template.isSystem) {
            this.logger.warn({ templateId }, 'scorecard:delete:is-system');
            throw new common_1.BadRequestException(`System templates cannot be deleted`);
        }
        const isInUse = await this.db.query.interviewInterviewers.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.interviewInterviewers.scorecardTemplateId, templateId),
        });
        if (isInUse) {
            this.logger.warn({ templateId }, 'scorecard:delete:in-use');
            throw new common_1.BadRequestException(`Cannot delete: This template is in use by one or more interviews`);
        }
        await this.db
            .delete(schema_1.scorecard_templates)
            .where((0, drizzle_orm_1.eq)(schema_1.scorecard_templates.id, templateId))
            .execute();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'scorecard_template',
            entityId: templateId,
            userId: id,
            details: 'Deleted scorecard template',
            changes: { name: template.name, description: template.description },
        });
        await this.burst({ companyId, templateId });
        this.logger.info({ templateId }, 'scorecard:delete:done');
        return { message: 'Template deleted successfully' };
    }
};
exports.ScorecardTemplateService = ScorecardTemplateService;
exports.ScorecardTemplateService = ScorecardTemplateService = ScorecardTemplateService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], ScorecardTemplateService);
//# sourceMappingURL=scorecard.service.js.map