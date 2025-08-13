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
let LeaveTypesService = class LeaveTypesService {
    constructor(auditService, db) {
        this.auditService = auditService;
        this.db = db;
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
            const result = await trx
                .insert(leave_types_schema_1.leaveTypes)
                .values(values)
                .returning({
                id: leave_types_schema_1.leaveTypes.id,
                name: leave_types_schema_1.leaveTypes.name,
                isPaid: leave_types_schema_1.leaveTypes.isPaid,
                colorTag: leave_types_schema_1.leaveTypes.colorTag,
            })
                .execute();
            return result;
        });
        return inserted;
    }
    async create(dto, user, ip) {
        const existingLeaveType = await this.db
            .select()
            .from(leave_types_schema_1.leaveTypes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.companyId, user.companyId), (0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.name, dto.name)))
            .execute();
        if (existingLeaveType.length > 0) {
            throw new common_1.NotFoundException(`Leave type with name ${dto.name} already exists`);
        }
        const { companyId, id } = user;
        const leaveType = await this.db
            .insert(leave_types_schema_1.leaveTypes)
            .values({
            companyId,
            name: dto.name,
            isPaid: dto.isPaid,
            colorTag: dto.colorTag,
        })
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'create',
            entity: 'leave',
            entityId: leaveType[0].id,
            details: 'Created new leave type',
            userId: id,
            ipAddress: ip,
            changes: {
                name: dto.name,
                isPaid: dto.isPaid,
                colorTag: dto.colorTag,
            },
        });
        return leaveType[0];
    }
    async findAll(companyId) {
        return this.db
            .select()
            .from(leave_types_schema_1.leaveTypes)
            .where((0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.companyId, companyId))
            .execute();
    }
    async findOne(companyId, leaveTypeId) {
        const leaveType = await this.db
            .select()
            .from(leave_types_schema_1.leaveTypes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.companyId, companyId), (0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.id, leaveTypeId)))
            .execute();
        if (leaveType.length === 0) {
            throw new common_1.NotFoundException(`Leave type with ID ${leaveTypeId} not found`);
        }
        return leaveType[0];
    }
    async update(leaveTypeId, dto, user, ip) {
        const { companyId, id } = user;
        const leaveType = await this.findOne(companyId, leaveTypeId);
        await this.db
            .update(leave_types_schema_1.leaveTypes)
            .set({
            name: dto.name ?? leaveType.name,
            isPaid: dto.isPaid ?? leaveType.isPaid,
            colorTag: dto.colorTag ?? leaveType.colorTag,
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.companyId, companyId), (0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.id, leaveTypeId)))
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'leave',
            entityId: leaveTypeId,
            userId: id,
            details: 'Updated leave type',
            ipAddress: ip,
            changes: {
                name: dto.name,
                isPaid: dto.isPaid,
                colorTag: dto.colorTag,
            },
        });
        return this.findOne(companyId, leaveTypeId);
    }
    async remove(companyId, leaveTypeId) {
        await this.findOne(companyId, leaveTypeId);
        const policyExists = await this.db
            .select()
            .from(leave_policies_schema_1.leavePolicies)
            .where((0, drizzle_orm_1.eq)(leave_policies_schema_1.leavePolicies.leaveTypeId, leaveTypeId))
            .execute();
        if (policyExists && policyExists.length > 0) {
            throw new common_1.BadRequestException("Cannot delete leave type: it's used by one or more leave policies.");
        }
        await this.db
            .delete(leave_types_schema_1.leaveTypes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.companyId, companyId), (0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.id, leaveTypeId)))
            .execute();
        return { success: true, message: 'Leave type deleted successfully' };
    }
};
exports.LeaveTypesService = LeaveTypesService;
exports.LeaveTypesService = LeaveTypesService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [audit_service_1.AuditService, Object])
], LeaveTypesService);
//# sourceMappingURL=leave-types.service.js.map