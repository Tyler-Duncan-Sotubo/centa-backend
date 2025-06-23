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
exports.AllowancesService = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const pay_group_allowances_schema_1 = require("../schema/pay-group-allowances.schema");
const drizzle_orm_1 = require("drizzle-orm");
const audit_service_1 = require("../../audit/audit.service");
let AllowancesService = class AllowancesService {
    constructor(db, auditService) {
        this.db = db;
        this.auditService = auditService;
    }
    async create(dto, user) {
        if (dto.valueType === 'percentage' && dto.percentage == null) {
            throw new common_1.BadRequestException('percentage is required for percentage-type allowance');
        }
        if (dto.valueType === 'fixed' && dto.fixedAmount == null) {
            throw new common_1.BadRequestException('fixedAmount is required for fixed-type allowance');
        }
        const [inserted] = await this.db
            .insert(pay_group_allowances_schema_1.payGroupAllowances)
            .values({
            payGroupId: dto.payGroupId,
            allowanceType: dto.allowanceType,
            valueType: dto.valueType,
            percentage: dto.percentage ?? '0.00',
            fixedAmount: dto.fixedAmount != null ? dto.fixedAmount * 100 : 0,
        })
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'create',
            entity: 'pay_group_allowance',
            entityId: inserted.id,
            userId: user.id,
            details: `Created allowance ${inserted.allowanceType} for pay group ${dto.payGroupId}`,
            changes: {
                payGroupId: dto.payGroupId,
                allowanceType: dto.allowanceType,
                valueType: dto.valueType,
                percentage: dto.percentage ?? '0.00',
                fixedAmount: dto.fixedAmount ?? 0,
            },
        });
        return inserted;
    }
    async findAll(payGroupId) {
        const qb = this.db.select().from(pay_group_allowances_schema_1.payGroupAllowances);
        if (payGroupId) {
            qb.where((0, drizzle_orm_1.eq)(pay_group_allowances_schema_1.payGroupAllowances.payGroupId, payGroupId));
        }
        return await qb.execute();
    }
    async findOne(id) {
        const [allowance] = await this.db
            .select()
            .from(pay_group_allowances_schema_1.payGroupAllowances)
            .where((0, drizzle_orm_1.eq)(pay_group_allowances_schema_1.payGroupAllowances.id, id))
            .execute();
        if (!allowance) {
            throw new common_1.BadRequestException(`Allowance ${id} not found`);
        }
        return allowance;
    }
    async update(id, dto, user) {
        await this.findOne(id);
        if (dto.valueType === 'percentage' && dto.percentage == null) {
            throw new common_1.BadRequestException('percentage is required for percentage-type allowance');
        }
        if (dto.valueType === 'fixed' && dto.fixedAmount == null) {
            throw new common_1.BadRequestException('fixedAmount is required for fixed-type allowance');
        }
        await this.db
            .update(pay_group_allowances_schema_1.payGroupAllowances)
            .set({ ...dto })
            .where((0, drizzle_orm_1.eq)(pay_group_allowances_schema_1.payGroupAllowances.id, id))
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'pay_group_allowance',
            entityId: id,
            userId: user.id,
            details: `Updated allowance ${id}`,
            changes: {
                ...dto,
            },
        });
        return { message: 'Allowance updated successfully' };
    }
    async remove(id, user) {
        await this.findOne(id);
        await this.db
            .delete(pay_group_allowances_schema_1.payGroupAllowances)
            .where((0, drizzle_orm_1.eq)(pay_group_allowances_schema_1.payGroupAllowances.id, id))
            .execute();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'pay_group_allowance',
            entityId: id,
            userId: user.id,
            details: `Deleted allowance ${id}`,
            changes: {
                id,
            },
        });
        return { message: 'Allowance deleted successfully' };
    }
};
exports.AllowancesService = AllowancesService;
exports.AllowancesService = AllowancesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService])
], AllowancesService);
//# sourceMappingURL=allowances.service.js.map