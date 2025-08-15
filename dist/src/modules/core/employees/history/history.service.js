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
exports.HistoryService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const audit_service_1 = require("../../../audit/audit.service");
const drizzle_orm_1 = require("drizzle-orm");
const history_schema_1 = require("../schema/history.schema");
const cache_service_1 = require("../../../../common/cache/cache.service");
let HistoryService = class HistoryService {
    constructor(db, auditService, cache) {
        this.db = db;
        this.auditService = auditService;
        this.cache = cache;
        this.table = history_schema_1.employeeHistory;
    }
    tags(scope) {
        return [
            `employee:${scope}:history`,
            `employee:${scope}:history:list`,
            `employee:${scope}:history:detail`,
        ];
    }
    async create(employeeId, dto, userId, ip) {
        const [created] = await this.db
            .insert(this.table)
            .values({
            employeeId,
            ...dto,
            type: dto.type,
        })
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'create',
            entity: 'Employee History',
            details: 'Created new employee history',
            userId,
            entityId: employeeId,
            ipAddress: ip,
            changes: { ...dto },
        });
        await this.cache.bumpCompanyVersion(employeeId);
        return created;
    }
    findAll(employeeId) {
        return this.cache.getOrSetVersioned(employeeId, ['history', 'list', employeeId], async () => {
            const rows = await this.db
                .select()
                .from(this.table)
                .where((0, drizzle_orm_1.eq)(this.table.employeeId, employeeId))
                .execute();
            return rows;
        }, { tags: this.tags(employeeId) });
    }
    async findOne(historyId) {
        return this.cache.getOrSetVersioned('global', ['history', 'detail', historyId], async () => {
            const [history] = await this.db
                .select()
                .from(this.table)
                .where((0, drizzle_orm_1.eq)(this.table.id, historyId))
                .execute();
            if (!history) {
                return {};
            }
            return history;
        }, { tags: this.tags('global') });
    }
    async update(historyId, dto, userId, ip) {
        const [history] = await this.db
            .select()
            .from(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.id, historyId))
            .execute();
        if (!history) {
            throw new common_1.NotFoundException(`History for employee ${historyId} not found`);
        }
        const [updated] = await this.db
            .update(this.table)
            .set({
            ...dto,
            type: dto.type,
        })
            .where((0, drizzle_orm_1.eq)(this.table.id, historyId))
            .returning()
            .execute();
        const changes = {};
        for (const key of Object.keys(dto)) {
            const before = history[key];
            const after = dto[key];
            if (before !== after)
                changes[key] = { before, after };
        }
        if (Object.keys(changes).length) {
            await this.auditService.logAction({
                action: 'update',
                entity: 'EmployeeHistory',
                details: 'Updated employee history',
                userId,
                entityId: historyId,
                ipAddress: ip,
                changes,
            });
        }
        await this.cache.bumpCompanyVersion(history.employeeId);
        await this.cache.bumpCompanyVersion('global');
        return updated;
    }
    async remove(historyId) {
        const [existing] = await this.db
            .select()
            .from(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.id, historyId))
            .execute();
        const result = await this.db
            .delete(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.id, historyId))
            .returning({ id: this.table.id })
            .execute();
        if (!result.length) {
            throw new common_1.NotFoundException(`History for employee ${historyId} not found`);
        }
        if (existing?.employeeId) {
            await this.cache.bumpCompanyVersion(existing.employeeId);
        }
        await this.cache.bumpCompanyVersion('global');
        return { deleted: true, id: result[0].id };
    }
};
exports.HistoryService = HistoryService;
exports.HistoryService = HistoryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        cache_service_1.CacheService])
], HistoryService);
//# sourceMappingURL=history.service.js.map