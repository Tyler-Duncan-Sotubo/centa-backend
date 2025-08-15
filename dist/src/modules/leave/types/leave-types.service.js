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
exports.LeaveTypesService = void 0;
const common_1 = require("@nestjs/common");
const audit_service_1 = require("../../audit/audit.service");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const leave_types_schema_1 = require("../schema/leave-types.schema");
const drizzle_orm_1 = require("drizzle-orm");
const create_leave_type_dto_1 = require("./dto/create-leave-type.dto");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const leave_policies_schema_1 = require("../schema/leave-policies.schema");
const cache_service_1 = require("../../../common/cache/cache.service");
let LeaveTypesService = class LeaveTypesService {
    constructor(auditService, db, cache) {
        this.auditService = auditService;
        this.db = db;
        this.cache = cache;
    }
    tags(companyId) {
        return [`company:${companyId}:leave`, `company:${companyId}:leave:types`];
    }
    async bulkCreateLeaveTypes(companyId, rows) {
        const dtos = [];
        for (const row of rows) {
            const dto = (0, class_transformer_1.plainToInstance)(create_leave_type_dto_1.CreateLeaveTypeDto, {
                name: row['Name'] || row['name'],
                isPaid: row['IsPaid'] !== undefined
                    ? row['IsPaid'] === 'true' || row['IsPaid'] === true
                    : undefined,
                colorTag: row['ColorTag'] || row['colorTag'],
            });
            const errs = await (0, class_validator_1.validate)(dto);
            if (errs.length) {
                throw new common_1.BadRequestException('Invalid CSV format or data: ' + JSON.stringify(errs));
            }
            dtos.push(dto);
        }
        const names = dtos.map((d) => d.name);
        const duplicates = await this.db
            .select({ name: leave_types_schema_1.leaveTypes.name })
            .from(leave_types_schema_1.leaveTypes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.companyId, companyId), (0, drizzle_orm_1.inArray)(leave_types_schema_1.leaveTypes.name, names)))
            .execute();
        if (duplicates.length) {
            const duplicateNames = duplicates.map((d) => d.name);
            throw new common_1.BadRequestException(`Leave type names already exist: ${duplicateNames.join(', ')}`);
        }
        const inserted = await this.db.transaction(async (trx) => {
            const values = dtos.map((d) => ({
                companyId,
                name: d.name,
                isPaid: d.isPaid ?? false,
                colorTag: d.colorTag || null,
            }));
            return trx
                .insert(leave_types_schema_1.leaveTypes)
                .values(values)
                .returning({
                id: leave_types_schema_1.leaveTypes.id,
                name: leave_types_schema_1.leaveTypes.name,
                isPaid: leave_types_schema_1.leaveTypes.isPaid,
                colorTag: leave_types_schema_1.leaveTypes.colorTag,
            })
                .execute();
        });
        await this.cache.bumpCompanyVersion(companyId);
        return inserted;
    }
    async create(dto, user, ip) {
        const { companyId, id } = user;
        const existing = await this.db
            .select()
            .from(leave_types_schema_1.leaveTypes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.companyId, companyId), (0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.name, dto.name)))
            .execute();
        if (existing.length > 0) {
            throw new common_1.BadRequestException(`Leave type with name "${dto.name}" already exists`);
        }
        const [created] = await this.db
            .insert(leave_types_schema_1.leaveTypes)
            .values({
            companyId,
            name: dto.name,
            isPaid: dto.isPaid ?? false,
            colorTag: dto.colorTag ?? null,
        })
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'create',
            entity: 'leave_type',
            entityId: created.id,
            details: 'Created new leave type',
            userId: id,
            ipAddress: ip,
            changes: {
                name: dto.name,
                isPaid: dto.isPaid ?? false,
                colorTag: dto.colorTag ?? null,
            },
        });
        await this.cache.bumpCompanyVersion(companyId);
        return created;
    }
    async findAll(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['leave', 'types', 'list'], async () => {
            return this.db
                .select()
                .from(leave_types_schema_1.leaveTypes)
                .where((0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.companyId, companyId))
                .execute();
        }, { tags: this.tags(companyId) });
    }
    async findOne(companyId, leaveTypeId) {
        return this.cache.getOrSetVersioned(companyId, ['leave', 'types', 'one', leaveTypeId], async () => {
            const rows = await this.db
                .select()
                .from(leave_types_schema_1.leaveTypes)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.companyId, companyId), (0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.id, leaveTypeId)))
                .execute();
            if (!rows.length) {
                throw new common_1.NotFoundException(`Leave type with ID ${leaveTypeId} not found`);
            }
            return rows[0];
        }, { tags: this.tags(companyId) });
    }
    async update(leaveTypeId, dto, user, ip) {
        const { companyId, id } = user;
        const current = await this.findOne(companyId, leaveTypeId);
        const [updated] = await this.db
            .update(leave_types_schema_1.leaveTypes)
            .set({
            name: dto.name ?? current.name,
            isPaid: dto.isPaid ?? current.isPaid,
            colorTag: dto.colorTag ?? current.colorTag,
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.companyId, companyId), (0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.id, leaveTypeId)))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'leave_type',
            entityId: leaveTypeId,
            userId: id,
            details: 'Updated leave type',
            ipAddress: ip,
            changes: { before: current, after: updated },
        });
        await this.cache.bumpCompanyVersion(companyId);
        return updated;
    }
    async remove(user, leaveTypeId) {
        const { companyId, id } = user;
        const existing = await this.findOne(companyId, leaveTypeId);
        const policyExists = await this.db
            .select()
            .from(leave_policies_schema_1.leavePolicies)
            .where((0, drizzle_orm_1.eq)(leave_policies_schema_1.leavePolicies.leaveTypeId, leaveTypeId))
            .execute();
        if (policyExists?.length) {
            throw new common_1.BadRequestException("Cannot delete leave type: it's used by one or more leave policies.");
        }
        await this.db
            .delete(leave_types_schema_1.leaveTypes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.companyId, companyId), (0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.id, leaveTypeId)))
            .execute();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'leave_type',
            entityId: existing.id,
            details: 'Deleted leave type',
            userId: id,
            changes: { id: existing.id, name: existing.name },
        });
        await this.cache.bumpCompanyVersion(companyId);
        return { success: true, message: 'Leave type deleted successfully' };
    }
};
exports.LeaveTypesService = LeaveTypesService;
exports.LeaveTypesService = LeaveTypesService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [audit_service_1.AuditService, Object, cache_service_1.CacheService])
], LeaveTypesService);
//# sourceMappingURL=leave-types.service.js.map