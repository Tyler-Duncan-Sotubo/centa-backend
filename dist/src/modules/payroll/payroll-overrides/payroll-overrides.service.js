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
exports.PayrollOverridesService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const payroll_overrides_schema_1 = require("../schema/payroll-overrides.schema");
const audit_service_1 = require("../../audit/audit.service");
const cache_service_1 = require("../../../common/cache/cache.service");
let PayrollOverridesService = class PayrollOverridesService {
    constructor(db, auditService, cache) {
        this.db = db;
        this.auditService = auditService;
        this.cache = cache;
    }
    async create(dto, user) {
        const [created] = await this.db
            .insert(payroll_overrides_schema_1.payrollOverrides)
            .values({
            companyId: user.companyId,
            employeeId: dto.employeeId,
            payrollDate: new Date(dto.payrollDate).toISOString(),
            forceInclude: dto.forceInclude ?? false,
            notes: dto.notes ?? '',
        })
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'create',
            entity: 'payrollOverride',
            entityId: created.id,
            details: 'Created new payroll override',
            userId: user.id,
            changes: {
                employeeId: dto.employeeId,
                payrollDate: dto.payrollDate,
                forceInclude: dto.forceInclude ?? false,
                notes: dto.notes ?? '',
            },
        });
        await this.cache.bumpCompanyVersion(user.companyId);
        await this.cache.invalidateTags([
            'payrollOverrides',
            `company:${user.companyId}:payrollOverrides`,
            `payrollOverride:${created.id}`,
        ]);
        return created;
    }
    async findAll(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['payrollOverrides', 'list'], async () => {
            return this.db
                .select()
                .from(payroll_overrides_schema_1.payrollOverrides)
                .where((0, drizzle_orm_1.eq)(payroll_overrides_schema_1.payrollOverrides.companyId, companyId))
                .execute();
        }, { tags: ['payrollOverrides', `company:${companyId}:payrollOverrides`] });
    }
    async findOne(id, companyId) {
        return this.cache.getOrSetVersioned(companyId, ['payrollOverrides', 'byId', id], async () => {
            const [record] = await this.db
                .select()
                .from(payroll_overrides_schema_1.payrollOverrides)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_overrides_schema_1.payrollOverrides.id, id), (0, drizzle_orm_1.eq)(payroll_overrides_schema_1.payrollOverrides.companyId, companyId)))
                .execute();
            if (!record)
                throw new common_1.NotFoundException('Override not found');
            return record;
        }, {
            tags: [
                'payrollOverrides',
                `company:${companyId}:payrollOverrides`,
                `payrollOverride:${id}`,
            ],
        });
    }
    async update(id, dto, user) {
        await this.findOne(id, user.companyId);
        const [updated] = await this.db
            .update(payroll_overrides_schema_1.payrollOverrides)
            .set({
            forceInclude: dto.forceInclude,
            notes: dto.notes,
            payrollDate: dto.payrollDate
                ? new Date(dto.payrollDate).toISOString()
                : undefined,
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_overrides_schema_1.payrollOverrides.id, id), (0, drizzle_orm_1.eq)(payroll_overrides_schema_1.payrollOverrides.companyId, user.companyId)))
            .returning()
            .execute();
        if (!updated) {
            throw new common_1.BadRequestException('Unable to update payroll override');
        }
        await this.auditService.logAction({
            action: 'update',
            entity: 'payrollOverride',
            entityId: id,
            userId: user.id,
            details: 'Updated payroll override',
            changes: {
                forceInclude: dto.forceInclude,
                notes: dto.notes,
                payrollDate: dto.payrollDate,
            },
        });
        await this.cache.bumpCompanyVersion(user.companyId);
        await this.cache.invalidateTags([
            'payrollOverrides',
            `company:${user.companyId}:payrollOverrides`,
            `payrollOverride:${id}`,
        ]);
        return updated;
    }
};
exports.PayrollOverridesService = PayrollOverridesService;
exports.PayrollOverridesService = PayrollOverridesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        cache_service_1.CacheService])
], PayrollOverridesService);
//# sourceMappingURL=payroll-overrides.service.js.map