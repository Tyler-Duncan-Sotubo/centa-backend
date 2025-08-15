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
const cache_service_1 = require("../../../common/cache/cache.service");
let PayrollAdjustmentsService = class PayrollAdjustmentsService {
    constructor(db, auditService, cache) {
        this.db = db;
        this.auditService = auditService;
        this.cache = cache;
    }
    async create(dto, user) {
        const [created] = await this.db
            .insert(payroll_adjustments_schema_1.payrollAdjustments)
            .values({
            companyId: user.companyId,
            employeeId: dto.employeeId,
            payrollDate: new Date(dto.payrollDate).toISOString(),
            amount: dto.amount,
            type: dto.type,
            label: dto.label,
            taxable: dto.taxable ?? true,
            proratable: dto.proratable ?? false,
            recurring: dto.recurring ?? false,
            notes: dto.notes ?? '',
            createdBy: user.id,
        })
            .returning()
            .execute();
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
                taxable: dto.taxable ?? true,
                proratable: dto.proratable ?? false,
                recurring: dto.recurring ?? false,
                notes: dto.notes ?? '',
            },
        });
        await this.cache.bumpCompanyVersion(user.companyId);
        await this.cache.invalidateTags([
            'payrollAdjustments',
            `company:${user.companyId}:payrollAdjustments`,
            `payrollAdjustment:${created.id}`,
        ]);
        return created;
    }
    async findAll(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['payrollAdjustments', 'list'], async () => {
            return this.db
                .select()
                .from(payroll_adjustments_schema_1.payrollAdjustments)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_adjustments_schema_1.payrollAdjustments.companyId, companyId), (0, drizzle_orm_1.eq)(payroll_adjustments_schema_1.payrollAdjustments.isDeleted, false)))
                .execute();
        }, {
            tags: ['payrollAdjustments', `company:${companyId}:payrollAdjustments`],
        });
    }
    async findOne(id, companyId) {
        return this.cache.getOrSetVersioned(companyId, ['payrollAdjustments', 'byId', id], async () => {
            const [record] = await this.db
                .select()
                .from(payroll_adjustments_schema_1.payrollAdjustments)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_adjustments_schema_1.payrollAdjustments.id, id), (0, drizzle_orm_1.eq)(payroll_adjustments_schema_1.payrollAdjustments.companyId, companyId), (0, drizzle_orm_1.eq)(payroll_adjustments_schema_1.payrollAdjustments.isDeleted, false)))
                .execute();
            if (!record)
                throw new common_1.NotFoundException('Payroll adjustment not found');
            return record;
        }, {
            tags: [
                'payrollAdjustments',
                `company:${companyId}:payrollAdjustments`,
                `payrollAdjustment:${id}`,
            ],
        });
    }
    async update(id, dto, user) {
        await this.findOne(id, user.companyId);
        const [updated] = await this.db
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
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_adjustments_schema_1.payrollAdjustments.id, id), (0, drizzle_orm_1.eq)(payroll_adjustments_schema_1.payrollAdjustments.companyId, user.companyId)))
            .returning()
            .execute();
        if (!updated)
            throw new common_1.BadRequestException('Unable to update payroll adjustment');
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
        await this.cache.bumpCompanyVersion(user.companyId);
        await this.cache.invalidateTags([
            'payrollAdjustments',
            `company:${user.companyId}:payrollAdjustments`,
            `payrollAdjustment:${id}`,
        ]);
        return updated;
    }
    async remove(id, user) {
        await this.findOne(id, user.companyId);
        const [result] = await this.db
            .update(payroll_adjustments_schema_1.payrollAdjustments)
            .set({ isDeleted: true })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_adjustments_schema_1.payrollAdjustments.id, id), (0, drizzle_orm_1.eq)(payroll_adjustments_schema_1.payrollAdjustments.companyId, user.companyId)))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'payrollAdjustment',
            entityId: id,
            userId: user.id,
            details: 'Soft-deleted payroll adjustment',
            changes: { isDeleted: true },
        });
        await this.cache.bumpCompanyVersion(user.companyId);
        await this.cache.invalidateTags([
            'payrollAdjustments',
            `company:${user.companyId}:payrollAdjustments`,
            `payrollAdjustment:${id}`,
        ]);
        return result;
    }
};
exports.PayrollAdjustmentsService = PayrollAdjustmentsService;
exports.PayrollAdjustmentsService = PayrollAdjustmentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        cache_service_1.CacheService])
], PayrollAdjustmentsService);
//# sourceMappingURL=payroll-adjustments.service.js.map