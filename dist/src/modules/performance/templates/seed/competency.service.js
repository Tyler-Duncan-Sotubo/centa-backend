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
exports.PerformanceCompetencyService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const common_2 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const performance_competencies_schema_1 = require("../schema/performance-competencies.schema");
const audit_service_1 = require("../../../audit/audit.service");
const defaults_1 = require("./defaults");
const performance_review_questions_schema_1 = require("../schema/performance-review-questions.schema");
const performance_competency_levels_schema_1 = require("../schema/performance-competency-levels.schema");
let PerformanceCompetencyService = class PerformanceCompetencyService {
    constructor(db, auditService) {
        this.db = db;
        this.auditService = auditService;
    }
    async create(companyId, dto, userId) {
        const whereClause = companyId
            ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.name, dto.name), (0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.companyId, companyId))
            : (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.name, dto.name), (0, drizzle_orm_1.isNull)(performance_competencies_schema_1.performanceCompetencies.companyId));
        const existing = await this.db
            .select()
            .from(performance_competencies_schema_1.performanceCompetencies)
            .where(whereClause);
        if (existing.length > 0) {
            throw new common_1.BadRequestException('Competency already exists for this company');
        }
        const [created] = await this.db
            .insert(performance_competencies_schema_1.performanceCompetencies)
            .values({
            companyId,
            name: dto.name,
            description: dto.description,
            isGlobal: !companyId,
            isActive: true,
            createdAt: new Date(),
        })
            .returning();
        await this.auditService.logAction({
            action: 'create',
            entity: 'performance_competency',
            entityId: created.id,
            userId,
            details: `Created competency: ${created.name}`,
            changes: {
                name: created.name,
                description: created.description,
            },
        });
        return created;
    }
    async getOnlyCompetencies(companyId) {
        const competencies = await this.db
            .select({
            id: performance_competencies_schema_1.performanceCompetencies.id,
            name: performance_competencies_schema_1.performanceCompetencies.name,
        })
            .from(performance_competencies_schema_1.performanceCompetencies)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.companyId, companyId), (0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.isGlobal, true)));
        return competencies;
    }
    async getCompetenciesWithQuestions(companyId) {
        const competencies = await this.db
            .select()
            .from(performance_competencies_schema_1.performanceCompetencies)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.companyId, companyId), (0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.isGlobal, true)));
        const competencyIds = competencies.map((c) => c.id);
        const questions = await this.db
            .select()
            .from(performance_review_questions_schema_1.performanceReviewQuestions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(performance_review_questions_schema_1.performanceReviewQuestions.competencyId, competencyIds), (0, drizzle_orm_1.eq)(performance_review_questions_schema_1.performanceReviewQuestions.isActive, true)));
        const grouped = competencies.map((comp) => ({
            ...comp,
            questions: questions.filter((q) => q.competencyId === comp.id),
        }));
        return grouped;
    }
    async getById(id, companyId) {
        const [competency] = await this.db
            .select()
            .from(performance_competencies_schema_1.performanceCompetencies)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.id, id), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.companyId, companyId), (0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.isGlobal, true))));
        if (!competency)
            throw new common_1.NotFoundException('Competency not found');
        if (competency.companyId !== companyId)
            throw new common_1.NotFoundException('Access denied');
        return competency;
    }
    async update(id, user, data) {
        const { companyId, id: userId } = user;
        const competency = await this.getById(id, companyId);
        await this.db
            .update(performance_competencies_schema_1.performanceCompetencies)
            .set({ ...data })
            .where((0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.id, id));
        await this.auditService.logAction({
            action: 'update',
            entity: 'performance_competency',
            entityId: id,
            userId: userId,
            details: `Updated competency: ${competency.name}`,
            changes: {
                name: data.name ?? competency.name,
                description: data.description ?? competency.description,
            },
        });
        return { message: 'Updated successfully' };
    }
    async delete(id, user) {
        const { companyId, id: userId } = user;
        const competency = await this.getById(id, companyId);
        await this.db
            .delete(performance_competencies_schema_1.performanceCompetencies)
            .where((0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.id, id));
        await this.auditService.logAction({
            action: 'delete',
            entity: 'performance_competency',
            entityId: id,
            userId: userId,
            details: `Deleted competency: ${competency.name}`,
        });
        return { message: 'Deleted successfully' };
    }
    async seedGlobalCompetencies() {
        for (const comp of defaults_1.competencies) {
            const existing = await this.db
                .select()
                .from(performance_competencies_schema_1.performanceCompetencies)
                .where((0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.name, comp.name));
            if (existing.length === 0) {
                await this.db.insert(performance_competencies_schema_1.performanceCompetencies).values({
                    name: comp.name,
                    description: comp.description,
                    isActive: true,
                    isGlobal: true,
                    companyId: null,
                    createdAt: new Date(),
                });
            }
        }
        return { message: `${defaults_1.competencies.length} global competencies seeded.` };
    }
    async seedSystemLevels() {
        const defaultLevels = [
            { name: 'Beginner', weight: 1 },
            { name: 'Intermediate', weight: 2 },
            { name: 'Advanced', weight: 3 },
            { name: 'Proficient', weight: 4 },
            { name: 'Expert / Leader', weight: 5 },
        ];
        for (const level of defaultLevels) {
            const exists = await this.db
                .select()
                .from(performance_competency_levels_schema_1.competencyLevels)
                .where((0, drizzle_orm_1.eq)(performance_competency_levels_schema_1.competencyLevels.name, level.name));
            if (exists.length === 0) {
                await this.db.insert(performance_competency_levels_schema_1.competencyLevels).values(level);
            }
        }
        return { message: 'System competency levels seeded successfully.' };
    }
    async getAllCompetencyLevels() {
        const levels = await this.db
            .select()
            .from(performance_competency_levels_schema_1.competencyLevels)
            .orderBy(performance_competency_levels_schema_1.competencyLevels.weight);
        return levels;
    }
};
exports.PerformanceCompetencyService = PerformanceCompetencyService;
exports.PerformanceCompetencyService = PerformanceCompetencyService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService])
], PerformanceCompetencyService);
//# sourceMappingURL=competency.service.js.map