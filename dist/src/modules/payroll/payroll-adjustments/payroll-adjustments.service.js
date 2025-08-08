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
exports.PayrollAdjustmentsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const payroll_adjustments_schema_1 = require("../schema/payroll-adjustments.schema");
const audit_service_1 = require("../../audit/audit.service");
let PayrollAdjustmentsService = class PayrollAdjustmentsService {
    constructor(db, auditService) {
        this.db = db;
        this.auditService = auditService;
    }
    async create(dto, user) {
        const [created] = await this.db
            .insert(payroll_adjustments_schema_1.payrollAdjustments)
            .values({
            companyId: user.companyId,
            employeeId: dto.employeeId,
            payrollDate: new Date(dto.payrollDate).toDateString(),
            amount: dto.amount,
            type: dto.type,
            label: dto.label,
            taxable: dto.taxable ?? true,
            proratable: dto.proratable ?? false,
            recurring: dto.recurring ?? false,
            notes: dto.notes ?? '',
            createdBy: user.id,
        })
            .returning();
        await this.auditService.logAction({
            action: 'create',
            entity: 'payrollAdjustment',
            entityId: created.id,
            userId: user.id,
            details: 'Created new payroll adjustment',
            changes: {
                employeeId: dto.employeeId,
                payrollDate: dto.payrollDate,
                amount: dto.amount,
                type: dto.type,
                label: dto.label,
                taxable: dto.taxable,
                proratable: dto.proratable,
                recurring: dto.recurring,
                notes: dto.notes,
            },
        });
        return created;
    }
    async findAll(companyId) {
        return this.db
            .select()
            .from(payroll_adjustments_schema_1.payrollAdjustments)
            .where((0, drizzle_orm_1.eq)(payroll_adjustments_schema_1.payrollAdjustments.companyId, companyId));
    }
    async findOne(id, companyId) {
        const [record] = await this.db
            .select()
            .from(payroll_adjustments_schema_1.payrollAdjustments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_adjustments_schema_1.payrollAdjustments.id, id), (0, drizzle_orm_1.eq)(payroll_adjustments_schema_1.payrollAdjustments.companyId, companyId)));
        if (!record)
            throw new common_1.NotFoundException('Payroll adjustment not found');
        return record;
    }
    async update(id, dto, user) {
        await this.findOne(id, user.companyId);
        const result = await this.db
            .update(payroll_adjustments_schema_1.payrollAdjustments)
            .set({
            amount: dto.amount,
            label: dto.label,
            notes: dto.notes,
            taxable: dto.taxable,
            proratable: dto.proratable,
            recurring: dto.recurring,
            type: dto.type,
            payrollDate: dto.payrollDate
                ? new Date(dto.payrollDate).toISOString()
                : undefined,
        })
            .where((0, drizzle_orm_1.eq)(payroll_adjustments_schema_1.payrollAdjustments.id, id))
            .returning();
        await this.auditService.logAction({
            action: 'update',
            entity: 'payrollAdjustment',
            entityId: id,
            userId: user.id,
            details: 'Updated payroll adjustment',
            changes: {
                amount: dto.amount,
                label: dto.label,
                notes: dto.notes,
                taxable: dto.taxable,
                proratable: dto.proratable,
                recurring: dto.recurring,
                type: dto.type,
                payrollDate: dto.payrollDate,
            },
        });
        return result[0];
    }
    async remove(id, user) {
        await this.findOne(id, user.companyId);
        const result = await this.db
            .update(payroll_adjustments_schema_1.payrollAdjustments)
            .set({
            isDeleted: true,
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_adjustments_schema_1.payrollAdjustments.id, id), (0, drizzle_orm_1.eq)(payroll_adjustments_schema_1.payrollAdjustments.companyId, user.companyId)))
            .returning()
            .execute();
        return result[0];
    }
};
exports.PayrollAdjustmentsService = PayrollAdjustmentsService;
exports.PayrollAdjustmentsService = PayrollAdjustmentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService])
], PayrollAdjustmentsService);
//# sourceMappingURL=payroll-adjustments.service.js.map