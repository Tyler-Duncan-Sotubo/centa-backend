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
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const audit_service_1 = require("../../audit/audit.service");
const pay_group_allowances_schema_1 = require("../schema/pay-group-allowances.schema");
const pay_groups_schema_1 = require("../schema/pay-groups.schema");
const cache_service_1 = require("../../../common/cache/cache.service");
let AllowancesService = class AllowancesService {
    constructor(db, auditService, cache) {
        this.db = db;
        this.auditService = auditService;
        this.cache = cache;
    }
    cents(n) {
        return n != null ? Math.round(n * 100) : 0;
    }
    async getCompanyIdByPayGroupId(payGroupId) {
        const [pg] = await this.db
            .select({ companyId: pay_groups_schema_1.payGroups.companyId })
            .from(pay_groups_schema_1.payGroups)
            .where((0, drizzle_orm_1.eq)(pay_groups_schema_1.payGroups.id, payGroupId))
            .limit(1)
            .execute();
        if (!pg?.companyId)
            throw new common_1.NotFoundException('Pay group not found');
        return pg.companyId;
    }
    async getCompanyIdByAllowanceId(allowanceId) {
        const [row] = await this.db
            .select({ payGroupId: pay_group_allowances_schema_1.payGroupAllowances.payGroupId })
            .from(pay_group_allowances_schema_1.payGroupAllowances)
            .where((0, drizzle_orm_1.eq)(pay_group_allowances_schema_1.payGroupAllowances.id, allowanceId))
            .limit(1)
            .execute();
        if (!row?.payGroupId)
            throw new common_1.NotFoundException('Allowance not found');
        return this.getCompanyIdByPayGroupId(row.payGroupId);
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
            fixedAmount: this.cents(dto.fixedAmount),
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
        await this.cache.bumpCompanyVersion(user.companyId);
        await this.cache.invalidateTags([
            `paygroup:${dto.payGroupId}`,
            'allowances:list',
        ]);
        return inserted;
    }
    async findAll(payGroupId) {
        if (!payGroupId) {
            return await this.db.select().from(pay_group_allowances_schema_1.payGroupAllowances).execute();
        }
        const companyId = await this.getCompanyIdByPayGroupId(payGroupId);
        return this.cache.getOrSetVersioned(companyId, ['paygroup', payGroupId, 'allowances'], async () => {
            return await this.db
                .select()
                .from(pay_group_allowances_schema_1.payGroupAllowances)
                .where((0, drizzle_orm_1.eq)(pay_group_allowances_schema_1.payGroupAllowances.payGroupId, payGroupId))
                .execute();
        }, { tags: ['allowances:list', `paygroup:${payGroupId}`] });
    }
    async findOne(id) {
        const companyId = await this.getCompanyIdByAllowanceId(id);
        return this.cache.getOrSetVersioned(companyId, ['allowance', id], async () => {
            const [allowance] = await this.db
                .select()
                .from(pay_group_allowances_schema_1.payGroupAllowances)
                .where((0, drizzle_orm_1.eq)(pay_group_allowances_schema_1.payGroupAllowances.id, id))
                .execute();
            if (!allowance) {
                throw new common_1.BadRequestException(`Allowance ${id} not found`);
            }
            return allowance;
        }, { tags: [`allowance:${id}`] });
    }
    async update(id, dto, user) {
        await this.findOne(id);
        if (dto.valueType === 'percentage' && dto.percentage == null) {
            throw new common_1.BadRequestException('percentage is required for percentage-type allowance');
        }
        if (dto.valueType === 'fixed' && dto.fixedAmount == null) {
            throw new common_1.BadRequestException('fixedAmount is required for fixed-type allowance');
        }
        const payload = {
            ...dto,
        };
        if (dto.fixedAmount != null) {
            payload.fixedAmount = this.cents(dto.fixedAmount);
        }
        await this.db
            .update(pay_group_allowances_schema_1.payGroupAllowances)
            .set(payload)
            .where((0, drizzle_orm_1.eq)(pay_group_allowances_schema_1.payGroupAllowances.id, id))
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'pay_group_allowance',
            entityId: id,
            userId: user.id,
            details: `Updated allowance ${id}`,
            changes: { ...dto },
        });
        const companyId = await this.getCompanyIdByAllowanceId(id);
        const [row] = await this.db
            .select({ payGroupId: pay_group_allowances_schema_1.payGroupAllowances.payGroupId })
            .from(pay_group_allowances_schema_1.payGroupAllowances)
            .where((0, drizzle_orm_1.eq)(pay_group_allowances_schema_1.payGroupAllowances.id, id))
            .limit(1)
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        await this.cache.invalidateTags([
            `allowance:${id}`,
            'allowances:list',
            ...(row?.payGroupId ? [`paygroup:${row.payGroupId}`] : []),
        ]);
        return { message: 'Allowance updated successfully' };
    }
    async remove(id, user) {
        const [existing] = await this.db
            .select({ payGroupId: pay_group_allowances_schema_1.payGroupAllowances.payGroupId })
            .from(pay_group_allowances_schema_1.payGroupAllowances)
            .where((0, drizzle_orm_1.eq)(pay_group_allowances_schema_1.payGroupAllowances.id, id))
            .limit(1)
            .execute();
        if (!existing?.payGroupId)
            throw new common_1.BadRequestException(`Allowance ${id} not found`);
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
            changes: { id },
        });
        const companyId = await this.getCompanyIdByPayGroupId(existing.payGroupId);
        await this.cache.bumpCompanyVersion(companyId);
        await this.cache.invalidateTags([
            `allowance:${id}`,
            'allowances:list',
            `paygroup:${existing.payGroupId}`,
        ]);
        return { message: 'Allowance deleted successfully' };
    }
};
exports.AllowancesService = AllowancesService;
exports.AllowancesService = AllowancesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        cache_service_1.CacheService])
], AllowancesService);
//# sourceMappingURL=allowances.service.js.map