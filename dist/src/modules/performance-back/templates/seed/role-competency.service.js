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
var RoleCompetencyExpectationService_1;
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
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../../../common/cache/cache.service");
let RoleCompetencyExpectationService = RoleCompetencyExpectationService_1 = class RoleCompetencyExpectationService {
    constructor(db, auditService, logger, cache) {
        this.db = db;
        this.auditService = auditService;
        this.logger = logger;
        this.cache = cache;
        this.logger.setContext(RoleCompetencyExpectationService_1.name);
    }
    listKey(companyId) {
        return `rce:${companyId}:list`;
    }
    settingsKey(companyId) {
        return `rce:${companyId}:framework:settings`;
    }
    fieldsKey(companyId) {
        return `rce:${companyId}:framework:fields`;
    }
    levelsKey() {
        return `rce:levels:all`;
    }
    async burst(opts) {
        const jobs = [];
        jobs.push(this.cache.del(this.listKey(opts.companyId)));
        jobs.push(this.cache.del(this.settingsKey(opts.companyId)));
        jobs.push(this.cache.del(this.fieldsKey(opts.companyId)));
        await Promise.allSettled(jobs);
        this.logger.debug(opts, 'rce:cache:burst');
    }
    async create(companyId, dto, user) {
        this.logger.info({ companyId, userId: user.id, dto }, 'rce:create:start');
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
                changes: { expectedLevelId: dto.expectedLevelId },
            });
            await this.burst({ companyId });
            this.logger.info({ id: existing.id }, 'rce:create:update-duplicate:done');
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
        await this.burst({ companyId });
        this.logger.info({ id: created.id }, 'rce:create:done');
        return created;
    }
    async update(id, dto, user) {
        this.logger.info({ id, userId: user.id, dto }, 'rce:update:start');
        const existing = await this.db.query.roleCompetencyExpectations.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_competency_role_expectations_schema_1.roleCompetencyExpectations.id, id), (0, drizzle_orm_1.eq)(performance_competency_role_expectations_schema_1.roleCompetencyExpectations.companyId, user.companyId)),
        });
        if (!existing) {
            this.logger.warn({ id, companyId: user.companyId }, 'rce:update:not-found');
            throw new common_1.NotFoundException('Expectation not found');
        }
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
        await this.burst({ companyId: user.companyId });
        this.logger.info({ id }, 'rce:update:done');
        return { message: 'Updated successfully' };
    }
    async delete(id, user) {
        this.logger.info({ id, userId: user.id }, 'rce:delete:start');
        const existing = await this.db.query.roleCompetencyExpectations.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_competency_role_expectations_schema_1.roleCompetencyExpectations.id, id), (0, drizzle_orm_1.eq)(performance_competency_role_expectations_schema_1.roleCompetencyExpectations.companyId, user.companyId)),
        });
        if (!existing) {
            this.logger.warn({ id, companyId: user.companyId }, 'rce:delete:not-found');
            throw new common_1.NotFoundException('Expectation not found');
        }
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
        await this.burst({ companyId: user.companyId });
        this.logger.info({ id }, 'rce:delete:done');
        return { message: 'Deleted successfully' };
    }
    async list(companyId) {
        const key = this.listKey(companyId);
        this.logger.debug({ companyId, key }, 'rce:list:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const rows = await this.db.query.roleCompetencyExpectations.findMany({
                where: (0, drizzle_orm_1.eq)(performance_competency_role_expectations_schema_1.roleCompetencyExpectations.companyId, companyId),
            });
            this.logger.debug({ companyId, count: rows.length }, 'rce:list:db:done');
            return rows;
        });
    }
    async getFrameworkSettings(companyId) {
        const key = this.settingsKey(companyId);
        this.logger.debug({ companyId, key }, 'rce:frameworkSettings:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const [roles, expectations] = await Promise.all([
                this.db
                    .select({ id: schema_1.jobRoles.id, title: schema_1.jobRoles.title })
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
                if (!expectationsByRole[item.roleId])
                    expectationsByRole[item.roleId] = [];
                expectationsByRole[item.roleId].push({
                    id: item.id,
                    competencyName: item.competencyName ?? '',
                    levelName: item.levelName ?? '',
                    competencyId: item.competencyId,
                });
            }
            const out = { roles, expectationsByRole };
            this.logger.debug({ companyId, roles: roles.length }, 'rce:frameworkSettings:db:done');
            return out;
        });
    }
    async getFrameworkFields(companyId) {
        const key = this.fieldsKey(companyId);
        this.logger.debug({ companyId, key }, 'rce:frameworkFields:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const competenciesRows = await this.db
                .select({
                id: performance_competencies_schema_1.performanceCompetencies.id,
                name: performance_competencies_schema_1.performanceCompetencies.name,
            })
                .from(performance_competencies_schema_1.performanceCompetencies)
                .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.companyId, companyId), (0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.isGlobal, true)));
            const levelsRows = await this.db
                .select({ id: schema_1.competencyLevels.id, name: schema_1.competencyLevels.name })
                .from(schema_1.competencyLevels);
            const out = { competencies: competenciesRows, levels: levelsRows };
            this.logger.debug({
                companyId,
                competencies: competenciesRows.length,
                levels: levelsRows.length,
            }, 'rce:frameworkFields:db:done');
            return out;
        });
    }
    async getAllCompetencyLevels() {
        const key = this.levelsKey();
        this.logger.debug({ key }, 'rce:getAllLevels:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const rows = await this.db
                .select({ id: schema_1.competencyLevels.id, name: schema_1.competencyLevels.name })
                .from(schema_1.competencyLevels);
            this.logger.debug({ count: rows.length }, 'rce:getAllLevels:db:done');
            return rows;
        });
    }
};
exports.RoleCompetencyExpectationService = RoleCompetencyExpectationService;
exports.RoleCompetencyExpectationService = RoleCompetencyExpectationService = RoleCompetencyExpectationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], RoleCompetencyExpectationService);
//# sourceMappingURL=role-competency.service.js.map