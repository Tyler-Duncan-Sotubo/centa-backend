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
exports.AppraisalCycleService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const audit_service_1 = require("../../audit/audit.service");
const performance_appraisal_cycle_schema_1 = require("./schema/performance-appraisal-cycle.schema");
const cache_service_1 = require("../../../common/cache/cache.service");
let AppraisalCycleService = class AppraisalCycleService {
    constructor(db, auditService, cache) {
        this.db = db;
        this.auditService = auditService;
        this.cache = cache;
    }
    ns(companyId) {
        return ['performance', 'appraisal-cycles', companyId];
    }
    tags(companyId) {
        return [
            `company:${companyId}`,
            'performance',
            'performance:appraisal-cycles',
        ];
    }
    async bump(companyId) {
        await this.cache.bumpCompanyVersion(companyId);
    }
    async create(createDto, companyId, userId) {
        const existing = await this.db
            .select()
            .from(performance_appraisal_cycle_schema_1.performanceAppraisalCycles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.name, createDto.name), (0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.companyId, companyId)))
            .execute();
        if (existing.length > 0) {
            throw new common_1.BadRequestException('Appraisal cycle name already exists');
        }
        const [created] = await this.db
            .insert(performance_appraisal_cycle_schema_1.performanceAppraisalCycles)
            .values({
            ...createDto,
            startDate: createDto.startDate,
            endDate: createDto.endDate,
            companyId,
        })
            .returning();
        if (userId) {
            await this.auditService.logAction({
                action: 'create',
                entity: 'performance_appraisal_cycle',
                entityId: created.id,
                userId,
                details: `Created appraisal cycle ${created.name}`,
                changes: {
                    name: created.name,
                    companyId,
                    startDate: created.startDate,
                    endDate: created.endDate,
                    status: created.status,
                },
            });
        }
        await this.bump(companyId);
        return created;
    }
    async findAll(companyId) {
        const key = [...this.ns(companyId), 'all'];
        const rows = await this.cache.getOrSetVersioned(companyId, [...key], async () => this.db
            .select()
            .from(performance_appraisal_cycle_schema_1.performanceAppraisalCycles)
            .where((0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.companyId, companyId))
            .orderBy((0, drizzle_orm_1.asc)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.startDate))
            .execute());
        const nowIso = new Date().toISOString();
        const current = rows.find((c) => c.startDate <= nowIso && c.endDate >= nowIso);
        return rows.map((c) => ({
            ...c,
            status: c.id === current?.id ? 'active' : 'upcoming',
        }));
    }
    async getLastCycle(companyId) {
        const key = [...this.ns(companyId), 'last'];
        return this.cache.getOrSetVersioned(companyId, [...key], async () => {
            const [lastCycle] = await this.db
                .select()
                .from(performance_appraisal_cycle_schema_1.performanceAppraisalCycles)
                .where((0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.companyId, companyId))
                .orderBy((0, drizzle_orm_1.desc)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.startDate))
                .limit(1)
                .execute();
            return lastCycle ?? null;
        });
    }
    async getLast(companyId) {
        return this.getLastCycle(companyId);
    }
    async findCurrent(companyId) {
        const day = new Date().toISOString().slice(0, 10);
        const key = [...this.ns(companyId), 'current', day];
        return this.cache.getOrSetVersioned(companyId, [...key], async () => {
            const today = new Date().toISOString();
            const current = await this.db
                .select()
                .from(performance_appraisal_cycle_schema_1.performanceAppraisalCycles)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.companyId, companyId), (0, drizzle_orm_1.lte)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.startDate, today), (0, drizzle_orm_1.gte)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.endDate, today)))
                .orderBy((0, drizzle_orm_1.desc)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.startDate))
                .limit(1)
                .execute();
            return current[0] ?? null;
        });
    }
    async findOne(id, companyId) {
        const key = [...this.ns(companyId), 'one', id];
        const cycle = await this.cache.getOrSetVersioned(companyId, [...key], async () => {
            const [row] = await this.db
                .select()
                .from(performance_appraisal_cycle_schema_1.performanceAppraisalCycles)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.id, id), (0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.companyId, companyId)))
                .limit(1)
                .execute();
            return row ?? null;
        });
        if (!cycle) {
            throw new common_1.NotFoundException(`Appraisal cycle with ID ${id} not found`);
        }
        const nowIso = new Date().toISOString();
        const isActive = cycle.startDate <= nowIso && cycle.endDate >= nowIso;
        return { ...cycle, status: isActive ? 'active' : 'upcoming' };
    }
    async update(id, updateDto, user) {
        await this.findOne(id, user.companyId);
        const [updated] = await this.db
            .update(performance_appraisal_cycle_schema_1.performanceAppraisalCycles)
            .set({
            ...updateDto,
            startDate: updateDto.startDate,
            endDate: updateDto.endDate,
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.id, id), (0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.companyId, user.companyId)))
            .returning();
        await this.auditService.logAction({
            action: 'update',
            entity: 'performance_appraisal_cycle',
            entityId: id,
            userId: user.id,
            details: `Updated appraisal cycle ${updated.name}`,
            changes: {
                ...updateDto,
                updatedAt: new Date().toISOString(),
            },
        });
        await this.bump(user.companyId);
        return updated;
    }
    async remove(id, user) {
        const { companyId, id: userId } = user;
        await this.findOne(id, companyId);
        await this.db
            .delete(performance_appraisal_cycle_schema_1.performanceAppraisalCycles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.id, id), (0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.companyId, companyId)))
            .execute();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'performance_appraisal_cycle',
            entityId: id,
            userId,
            details: `Deleted appraisal cycle ${id}`,
            changes: {
                deletedAt: new Date().toISOString(),
            },
        });
        await this.bump(companyId);
        return { message: 'Cycle deleted successfully' };
    }
};
exports.AppraisalCycleService = AppraisalCycleService;
exports.AppraisalCycleService = AppraisalCycleService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        cache_service_1.CacheService])
], AppraisalCycleService);
//# sourceMappingURL=appraisal-cycle.service.js.map