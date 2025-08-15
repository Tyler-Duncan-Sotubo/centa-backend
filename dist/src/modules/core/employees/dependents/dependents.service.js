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
exports.DependentsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const audit_service_1 = require("../../../audit/audit.service");
const drizzle_orm_1 = require("drizzle-orm");
const dependents_schema_1 = require("../schema/dependents.schema");
const cache_service_1 = require("../../../../common/cache/cache.service");
let DependentsService = class DependentsService {
    constructor(db, auditService, cache) {
        this.db = db;
        this.auditService = auditService;
        this.cache = cache;
        this.table = dependents_schema_1.employeeDependents;
    }
    tags(scope) {
        return [
            `employee:${scope}:dependents`,
            `employee:${scope}:dependents:list`,
            `employee:${scope}:dependents:detail`,
        ];
    }
    async create(employeeId, dto, userId, ip) {
        const [created] = await this.db
            .insert(this.table)
            .values({ employeeId, ...dto })
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'create',
            entity: 'Employee Dependent',
            details: 'Created new employee dependent',
            userId,
            entityId: employeeId,
            ipAddress: ip,
            changes: { ...dto },
        });
        await this.cache.bumpCompanyVersion(employeeId);
        await this.cache.bumpCompanyVersion('global');
        return created;
    }
    findAll(employeeId) {
        return this.cache.getOrSetVersioned(employeeId, ['dependents', 'list', employeeId], async () => {
            const rows = await this.db
                .select()
                .from(this.table)
                .where((0, drizzle_orm_1.eq)(this.table.employeeId, employeeId))
                .execute();
            return rows;
        }, { tags: this.tags(employeeId) });
    }
    async findOne(dependentId) {
        return this.cache.getOrSetVersioned('global', ['dependents', 'detail', dependentId], async () => {
            const [dependent] = await this.db
                .select()
                .from(this.table)
                .where((0, drizzle_orm_1.eq)(this.table.id, dependentId))
                .execute();
            if (!dependent) {
                return {};
            }
            return dependent;
        }, { tags: this.tags('global') });
    }
    async update(dependentId, dto, userId, ip) {
        const [dependant] = await this.db
            .select()
            .from(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.id, dependentId))
            .execute();
        if (!dependant) {
            throw new common_1.NotFoundException(`Dependent for employee ${dependentId} not found`);
        }
        const [updated] = await this.db
            .update(this.table)
            .set({ ...dto })
            .where((0, drizzle_orm_1.eq)(this.table.id, dependentId))
            .returning()
            .execute();
        const changes = {};
        for (const key of Object.keys(dto)) {
            const before = dependant[key];
            const after = dto[key];
            if (before !== after) {
                changes[key] = { before, after };
            }
        }
        if (Object.keys(changes).length) {
            await this.auditService.logAction({
                action: 'update',
                entity: 'Employee Dependent',
                details: 'Updated employee dependent',
                userId,
                entityId: dependentId,
                ipAddress: ip,
                changes,
            });
        }
        await this.cache.bumpCompanyVersion(dependant.employeeId);
        await this.cache.bumpCompanyVersion('global');
        return updated;
    }
    async remove(dependentId) {
        const [existing] = await this.db
            .select()
            .from(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.id, dependentId))
            .execute();
        const result = await this.db
            .delete(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.id, dependentId))
            .returning({ id: this.table.id })
            .execute();
        if (!result.length) {
            throw new common_1.NotFoundException(`Profile for employee ${dependentId} not found`);
        }
        if (existing?.employeeId) {
            await this.cache.bumpCompanyVersion(existing.employeeId);
        }
        await this.cache.bumpCompanyVersion('global');
        return { deleted: true, id: result[0].id };
    }
};
exports.DependentsService = DependentsService;
exports.DependentsService = DependentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        cache_service_1.CacheService])
], DependentsService);
//# sourceMappingURL=dependents.service.js.map