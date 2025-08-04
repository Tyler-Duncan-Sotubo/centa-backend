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
exports.RoleCompetencyExpectationService = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const performance_competency_role_expectations_schema_1 = require("../schema/performance-competency-role-expectations.schema");
const audit_service_1 = require("../../../audit/audit.service");
const performance_competencies_schema_1 = require("../schema/performance-competencies.schema");
const schema_1 = require("../../../../drizzle/schema");
let RoleCompetencyExpectationService = class RoleCompetencyExpectationService {
    constructor(db, auditService) {
        this.db = db;
        this.auditService = auditService;
    }
    async create(companyId, dto, user) {
        const existing = await this.db.query.roleCompetencyExpectations.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_competency_role_expectations_schema_1.roleCompetencyExpectations.companyId, companyId), (0, drizzle_orm_1.eq)(performance_competency_role_expectations_schema_1.roleCompetencyExpectations.roleId, dto.roleId), (0, drizzle_orm_1.eq)(performance_competency_role_expectations_schema_1.roleCompetencyExpectations.competencyId, dto.competencyId)),
        });
        if (existing) {
            await this.db
                .update(performance_competency_role_expectations_schema_1.roleCompetencyExpectations)
                .set({ expectedLevelId: dto.expectedLevelId })
                .where((0, drizzle_orm_1.eq)(performance_competency_role_expectations_schema_1.roleCompetencyExpectations.id, existing.id));
            await this.auditService.logAction({
                action: 'update',
                entity: 'role_competency_expectation',
                entityId: existing.id,
                userId: user.id,
                details: `Updated expectation for role: ${dto.roleId}, competency: ${dto.competencyId}`,
                changes: {
                    expectedLevelId: dto.expectedLevelId,
                },
            });
            return { ...existing, expectedLevelId: dto.expectedLevelId };
        }
        const [created] = await this.db
            .insert(performance_competency_role_expectations_schema_1.roleCompetencyExpectations)
            .values({
            companyId,
            roleId: dto.roleId,
            competencyId: dto.competencyId,
            expectedLevelId: dto.expectedLevelId,
        })
            .returning();
        await this.auditService.logAction({
            action: 'create',
            entity: 'role_competency_expectation',
            entityId: created.id,
            userId: user.id,
            details: `Created expectation for role: ${dto.roleId}, competency: ${dto.competencyId}`,
            changes: {
                roleId: dto.roleId,
                competencyId: dto.competencyId,
                expectedLevelId: dto.expectedLevelId,
            },
        });
        return created;
    }
    async update(id, dto, user) {
        const existing = await this.db.query.roleCompetencyExpectations.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_competency_role_expectations_schema_1.roleCompetencyExpectations.id, id), (0, drizzle_orm_1.eq)(performance_competency_role_expectations_schema_1.roleCompetencyExpectations.companyId, user.companyId)),
        });
        if (!existing)
            throw new common_1.NotFoundException('Expectation not found');
        await this.db
            .update(performance_competency_role_expectations_schema_1.roleCompetencyExpectations)
            .set({
            roleId: dto.roleId ?? existing.roleId,
            competencyId: dto.competencyId ?? existing.competencyId,
            expectedLevelId: dto.expectedLevelId ?? existing.expectedLevelId,
        })
            .where((0, drizzle_orm_1.eq)(performance_competency_role_expectations_schema_1.roleCompetencyExpectations.id, id));
        await this.auditService.logAction({
            action: 'update',
            entity: 'role_competency_expectation',
            entityId: id,
            userId: user.id,
            details: `Updated expectation for role: ${existing.roleId}`,
            changes: {
                roleId: dto.roleId ?? existing.roleId,
                competencyId: dto.competencyId ?? existing.competencyId,
                expectedLevelId: dto.expectedLevelId ?? existing.expectedLevelId,
            },
        });
        return { message: 'Updated successfully' };
    }
    async delete(id, user) {
        const existing = await this.db.query.roleCompetencyExpectations.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_competency_role_expectations_schema_1.roleCompetencyExpectations.id, id), (0, drizzle_orm_1.eq)(performance_competency_role_expectations_schema_1.roleCompetencyExpectations.companyId, user.companyId)),
        });
        if (!existing)
            throw new common_1.NotFoundException('Expectation not found');
        await this.db
            .delete(performance_competency_role_expectations_schema_1.roleCompetencyExpectations)
            .where((0, drizzle_orm_1.eq)(performance_competency_role_expectations_schema_1.roleCompetencyExpectations.id, id));
        await this.auditService.logAction({
            action: 'delete',
            entity: 'role_competency_expectation',
            entityId: id,
            userId: user.id,
            details: `Deleted expectation for role: ${existing.roleId}`,
        });
        return { message: 'Deleted successfully' };
    }
    async list(companyId) {
        return await this.db.query.roleCompetencyExpectations.findMany({
            where: (0, drizzle_orm_1.eq)(performance_competency_role_expectations_schema_1.roleCompetencyExpectations.companyId, companyId),
        });
    }
    async getFrameworkSettings(companyId) {
        const [roles, expectations] = await Promise.all([
            this.db
                .select({
                id: schema_1.jobRoles.id,
                title: schema_1.jobRoles.title,
            })
                .from(schema_1.jobRoles)
                .where((0, drizzle_orm_1.eq)(schema_1.jobRoles.companyId, companyId)),
            this.db
                .select({
                id: performance_competency_role_expectations_schema_1.roleCompetencyExpectations.id,
                roleId: performance_competency_role_expectations_schema_1.roleCompetencyExpectations.roleId,
                competencyId: performance_competency_role_expectations_schema_1.roleCompetencyExpectations.competencyId,
                expectedLevelId: performance_competency_role_expectations_schema_1.roleCompetencyExpectations.expectedLevelId,
                competencyName: performance_competencies_schema_1.performanceCompetencies.name,
                levelName: schema_1.competencyLevels.name,
            })
                .from(performance_competency_role_expectations_schema_1.roleCompetencyExpectations)
                .leftJoin(performance_competencies_schema_1.performanceCompetencies, (0, drizzle_orm_1.eq)(performance_competency_role_expectations_schema_1.roleCompetencyExpectations.competencyId, performance_competencies_schema_1.performanceCompetencies.id))
                .leftJoin(schema_1.competencyLevels, (0, drizzle_orm_1.eq)(performance_competency_role_expectations_schema_1.roleCompetencyExpectations.expectedLevelId, schema_1.competencyLevels.id))
                .where((0, drizzle_orm_1.eq)(performance_competency_role_expectations_schema_1.roleCompetencyExpectations.companyId, companyId)),
        ]);
        const expectationsByRole = {};
        for (const item of expectations) {
            if (!expectationsByRole[item.roleId]) {
                expectationsByRole[item.roleId] = [];
            }
            expectationsByRole[item.roleId].push({
                id: item.id,
                competencyName: item.competencyName ?? '',
                levelName: item.levelName ?? '',
                competencyId: item.competencyId,
            });
        }
        return {
            roles,
            expectationsByRole,
        };
    }
    async getFrameworkFields(companyId) {
        const competencies = await this.db
            .select({
            id: performance_competencies_schema_1.performanceCompetencies.id,
            name: performance_competencies_schema_1.performanceCompetencies.name,
        })
            .from(performance_competencies_schema_1.performanceCompetencies)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.companyId, companyId), (0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.isGlobal, true)));
        const levels = await this.db
            .select({
            id: schema_1.competencyLevels.id,
            name: schema_1.competencyLevels.name,
        })
            .from(schema_1.competencyLevels);
        return { competencies, levels };
    }
    async getAllCompetencyLevels() {
        return await this.db
            .select({
            id: schema_1.competencyLevels.id,
            name: schema_1.competencyLevels.name,
        })
            .from(schema_1.competencyLevels);
    }
};
exports.RoleCompetencyExpectationService = RoleCompetencyExpectationService;
exports.RoleCompetencyExpectationService = RoleCompetencyExpectationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService])
], RoleCompetencyExpectationService);
//# sourceMappingURL=role-competency.service.js.map