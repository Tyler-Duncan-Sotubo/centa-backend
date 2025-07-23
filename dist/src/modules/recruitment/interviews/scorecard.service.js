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
exports.ScorecardTemplateService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const audit_service_1 = require("../../audit/audit.service");
const schema_1 = require("../schema");
let ScorecardTemplateService = class ScorecardTemplateService {
    constructor(db, auditService) {
        this.db = db;
        this.auditService = auditService;
    }
    async getAllTemplates(companyId) {
        const templates = await this.db
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
        ))`.as('criteria'),
        })
            .from(schema_1.scorecard_templates)
            .leftJoin(schema_1.scorecard_criteria, (0, drizzle_orm_1.eq)(schema_1.scorecard_templates.id, schema_1.scorecard_criteria.templateId))
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(schema_1.scorecard_templates.companyId), (0, drizzle_orm_1.eq)(schema_1.scorecard_templates.companyId, companyId)))
            .groupBy(schema_1.scorecard_templates.id)
            .orderBy(schema_1.scorecard_templates.createdAt);
        return templates;
    }
    async create(user, dto) {
        const { companyId, id } = user;
        const [template] = await this.db
            .insert(schema_1.scorecard_templates)
            .values({
            name: dto.name,
            description: dto.description,
            companyId,
            isSystem: false,
        })
            .returning();
        const criteria = dto.criteria.map((c, index) => ({
            templateId: template.id,
            label: c.label,
            description: c.description,
            maxScore: c.maxScore,
            order: index + 1,
        }));
        await this.db.insert(schema_1.scorecard_criteria).values(criteria);
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
        return template;
    }
    async cloneTemplate(templateId, user) {
        const { companyId, id } = user;
        const [template] = await this.db
            .select()
            .from(schema_1.scorecard_templates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.scorecard_templates.id, templateId), (0, drizzle_orm_1.isNull)(schema_1.scorecard_templates.companyId)));
        if (!template)
            throw new common_1.NotFoundException('System template not found');
        const [cloned] = await this.db
            .insert(schema_1.scorecard_templates)
            .values({
            name: `${template.name} (Copy)`,
            description: template.description,
            companyId,
            isSystem: false,
        })
            .returning();
        await this.auditService.logAction({
            action: 'clone',
            entity: 'scorecard_template',
            entityId: cloned.id,
            userId: id,
            details: 'Cloned scorecard template',
            changes: {
                name: cloned.name,
                description: cloned.description,
            },
        });
        return cloned;
    }
    async seedSystemTemplates() {
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
                .returning();
            const criteria = tmpl.criteria.map((c, index) => ({
                templateId: template.id,
                label: c.label,
                description: c.description,
                maxScore: 5,
                order: index + 1,
            }));
            await this.db.insert(schema_1.scorecard_criteria).values(criteria);
        }
        return { success: true };
    }
    async deleteTemplate(templateId, user) {
        const { companyId, id } = user;
        const template = await this.db.query.scorecard_templates.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.scorecard_templates.id, templateId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(schema_1.scorecard_templates.companyId), (0, drizzle_orm_1.eq)(schema_1.scorecard_templates.companyId, companyId))),
        });
        if (!template) {
            throw new common_1.NotFoundException(`Template not found`);
        }
        if (template.isSystem) {
            throw new common_1.BadRequestException(`System templates cannot be deleted`);
        }
        const isInUse = await this.db.query.interviewInterviewers.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.interviewInterviewers.scorecardTemplateId, templateId),
        });
        if (isInUse) {
            throw new common_1.BadRequestException(`Cannot delete: This template is in use by one or more interviews`);
        }
        await this.db
            .delete(schema_1.scorecard_templates)
            .where((0, drizzle_orm_1.eq)(schema_1.scorecard_templates.id, templateId));
        await this.auditService.logAction({
            action: 'delete',
            entity: 'scorecard_template',
            entityId: templateId,
            userId: id,
            details: 'Deleted scorecard template',
            changes: {
                name: template.name,
                description: template.description,
            },
        });
        return { message: 'Template deleted successfully' };
    }
};
exports.ScorecardTemplateService = ScorecardTemplateService;
exports.ScorecardTemplateService = ScorecardTemplateService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService])
], ScorecardTemplateService);
//# sourceMappingURL=scorecard.service.js.map