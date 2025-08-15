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
exports.ProfileService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const audit_service_1 = require("../../../audit/audit.service");
const profile_schema_1 = require("../schema/profile.schema");
const drizzle_orm_1 = require("drizzle-orm");
const cache_service_1 = require("../../../../common/cache/cache.service");
let ProfileService = class ProfileService {
    constructor(db, auditService, cache) {
        this.db = db;
        this.auditService = auditService;
        this.cache = cache;
        this.table = profile_schema_1.employeeProfiles;
    }
    tags(scope) {
        return [`employee:${scope}:profile`, `employee:${scope}:profile:detail`];
    }
    async upsert(employeeId, dto, userId, ip) {
        const [employee] = await this.db
            .select()
            .from(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.employeeId, employeeId))
            .execute();
        if (employee) {
            const [updated] = await this.db
                .update(this.table)
                .set({ ...dto })
                .where((0, drizzle_orm_1.eq)(this.table.employeeId, employeeId))
                .returning()
                .execute();
            const changes = {};
            for (const key of Object.keys(dto)) {
                const before = employee[key];
                const after = dto[key];
                if (before !== after) {
                    changes[key] = { before, after };
                }
            }
            if (Object.keys(changes).length) {
                await this.auditService.logAction({
                    action: 'update',
                    entity: 'Employee Profile',
                    details: 'Updated employee profile',
                    userId,
                    entityId: employeeId,
                    ipAddress: ip,
                    changes,
                });
            }
            await this.cache.bumpCompanyVersion(employeeId);
            await this.cache.bumpCompanyVersion('global');
            return updated;
        }
        else {
            const [created] = await this.db
                .insert(this.table)
                .values({ employeeId, ...dto })
                .returning()
                .execute();
            await this.auditService.logAction({
                action: 'create',
                entity: 'Employee Profile',
                details: 'Created new employee profile',
                userId,
                entityId: employeeId,
                ipAddress: ip,
                changes: { ...dto },
            });
            await this.cache.bumpCompanyVersion(employeeId);
            await this.cache.bumpCompanyVersion('global');
            return created;
        }
    }
    async findOne(employeeId) {
        return this.cache.getOrSetVersioned(employeeId, ['profile', 'detail', employeeId], async () => {
            const [profile] = await this.db
                .select()
                .from(this.table)
                .where((0, drizzle_orm_1.eq)(this.table.employeeId, employeeId))
                .execute();
            return profile ?? {};
        }, { tags: this.tags(employeeId) });
    }
    async remove(employeeId) {
        const result = await this.db
            .delete(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.employeeId, employeeId))
            .returning({ id: this.table.id })
            .execute();
        if (!result.length) {
            throw new common_1.NotFoundException(`Profile for employee ${employeeId} not found`);
        }
        await this.cache.bumpCompanyVersion(employeeId);
        await this.cache.bumpCompanyVersion('global');
        return { deleted: true, id: result[0].id };
    }
};
exports.ProfileService = ProfileService;
exports.ProfileService = ProfileService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        cache_service_1.CacheService])
], ProfileService);
//# sourceMappingURL=profile.service.js.map