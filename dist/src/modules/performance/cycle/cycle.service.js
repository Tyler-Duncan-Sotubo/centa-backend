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
exports.CycleService = void 0;
const common_1 = require("@nestjs/common");
const audit_service_1 = require("../../audit/audit.service");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const performance_cycles_schema_1 = require("./schema/performance-cycles.schema");
const cache_service_1 = require("../../../common/cache/cache.service");
let CycleService = class CycleService {
    constructor(auditService, db, cache) {
        this.auditService = auditService;
        this.db = db;
        this.cache = cache;
        this.ttlSeconds = 10 * 60;
    }
    tags(companyId) {
        return [`company:${companyId}:performance-cycles`];
    }
    async invalidate(companyId) {
        await this.cache.bumpCompanyVersion(companyId);
    }
    async create(createCycleDto, companyId, userId) {
        const existingCycle = await this.db
            .select()
            .from(performance_cycles_schema_1.performanceCycles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_cycles_schema_1.performanceCycles.name, createCycleDto.name), (0, drizzle_orm_1.eq)(performance_cycles_schema_1.performanceCycles.companyId, companyId)))
            .execute();
        if (existingCycle.length > 0) {
            throw new common_1.BadRequestException('Cycle with this name already exists');
        }
        const today = new Date();
        const startDate = new Date(createCycleDto.startDate);
        const endDate = new Date(createCycleDto.endDate);
        let status = 'draft';
        if (endDate < startDate) {
            throw new common_1.BadRequestException('End date must be after start date');
        }
        if (startDate <= today || endDate <= today) {
            status = 'active';
        }
        const [newCycle] = await this.db
            .insert(performance_cycles_schema_1.performanceCycles)
            .values({
            ...createCycleDto,
            status,
            companyId,
        })
            .returning()
            .execute();
        if (userId) {
            await this.auditService.logAction({
                action: 'create',
                entity: 'performance_cycle',
                entityId: newCycle.id,
                userId,
                details: `Created performance cycle ${newCycle.name}`,
                changes: {
                    name: newCycle.name,
                    companyId,
                    startDate: newCycle.startDate,
                    endDate: newCycle.endDate,
                    status: newCycle.status,
                },
            });
        }
        await this.invalidate(companyId);
        return newCycle;
    }
    async findAll(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['performance-cycles', 'all'], async () => this.db
            .select()
            .from(performance_cycles_schema_1.performanceCycles)
            .where((0, drizzle_orm_1.eq)(performance_cycles_schema_1.performanceCycles.companyId, companyId))
            .orderBy((0, drizzle_orm_1.desc)(performance_cycles_schema_1.performanceCycles.startDate))
            .execute(), { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) });
    }
    async findCurrent(companyId) {
        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);
        return this.cache.getOrSetVersioned(companyId, ['performance-cycles', 'current'], async () => {
            const rows = await this.db
                .select()
                .from(performance_cycles_schema_1.performanceCycles)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_cycles_schema_1.performanceCycles.companyId, companyId), (0, drizzle_orm_1.lte)(performance_cycles_schema_1.performanceCycles.startDate, todayStr), (0, drizzle_orm_1.gte)(performance_cycles_schema_1.performanceCycles.endDate, todayStr)))
                .orderBy((0, drizzle_orm_1.desc)(performance_cycles_schema_1.performanceCycles.startDate))
                .limit(1)
                .execute();
            return rows[0] ?? null;
        }, { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) });
    }
    async findOne(id) {
        const [cycle] = await this.db
            .select()
            .from(performance_cycles_schema_1.performanceCycles)
            .where((0, drizzle_orm_1.eq)(performance_cycles_schema_1.performanceCycles.id, id))
            .execute();
        if (!cycle) {
            throw new common_1.NotFoundException(`Performance cycle with ID ${id} not found.`);
        }
        return cycle;
    }
    async findOneScoped(companyId, id) {
        return this.cache.getOrSetVersioned(companyId, ['performance-cycles', 'one', id], async () => {
            const [cycle] = await this.db
                .select()
                .from(performance_cycles_schema_1.performanceCycles)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_cycles_schema_1.performanceCycles.id, id), (0, drizzle_orm_1.eq)(performance_cycles_schema_1.performanceCycles.companyId, companyId)))
                .execute();
            if (!cycle) {
                throw new common_1.NotFoundException(`Performance cycle with ID ${id} not found.`);
            }
            return cycle;
        }, { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) });
    }
    async getLastCycle(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['performance-cycles', 'last'], async () => {
            const [lastCycle] = await this.db
                .select()
                .from(performance_cycles_schema_1.performanceCycles)
                .where((0, drizzle_orm_1.eq)(performance_cycles_schema_1.performanceCycles.companyId, companyId))
                .orderBy((0, drizzle_orm_1.desc)(performance_cycles_schema_1.performanceCycles.startDate))
                .limit(1)
                .execute();
            return lastCycle ?? null;
        }, { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) });
    }
    async update(id, updateCycleDto, user) {
        const { id: userId, companyId } = user;
        await this.findOneScoped(companyId, id);
        const [updatedCycle] = await this.db
            .update(performance_cycles_schema_1.performanceCycles)
            .set(updateCycleDto)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_cycles_schema_1.performanceCycles.id, id), (0, drizzle_orm_1.eq)(performance_cycles_schema_1.performanceCycles.companyId, companyId)))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'performance_cycle',
            entityId: id,
            userId,
            details: `Updated performance cycle ${updatedCycle.name}`,
            changes: {
                ...updateCycleDto,
                id: updatedCycle.id,
                companyId: updatedCycle.companyId,
                startDate: updatedCycle.startDate,
                endDate: updatedCycle.endDate,
                status: updatedCycle.status,
                updatedAt: new Date().toISOString(),
                updatedBy: userId,
            },
        });
        await this.invalidate(companyId);
        return updatedCycle;
    }
    async remove(id, user) {
        const { id: userId, companyId } = user;
        await this.findOneScoped(companyId, id);
        await this.db
            .delete(performance_cycles_schema_1.performanceCycles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_cycles_schema_1.performanceCycles.id, id), (0, drizzle_orm_1.eq)(performance_cycles_schema_1.performanceCycles.companyId, companyId)))
            .execute();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'performance_cycle',
            entityId: id,
            userId,
            details: `Deleted performance cycle with ID ${id}`,
            changes: {
                id,
                companyId,
                status: 'deleted',
                deletedAt: new Date().toISOString(),
                deletedBy: userId,
            },
        });
        await this.invalidate(companyId);
    }
};
exports.CycleService = CycleService;
exports.CycleService = CycleService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [audit_service_1.AuditService, Object, cache_service_1.CacheService])
], CycleService);
//# sourceMappingURL=cycle.service.js.map