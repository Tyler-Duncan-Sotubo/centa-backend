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
exports.CompensationService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const audit_service_1 = require("../../../audit/audit.service");
const drizzle_orm_1 = require("drizzle-orm");
const compensation_schema_1 = require("../schema/compensation.schema");
const employee_schema_1 = require("../schema/employee.schema");
const cache_service_1 = require("../../../../common/cache/cache.service");
let CompensationService = class CompensationService {
    constructor(db, auditService, cache) {
        this.db = db;
        this.auditService = auditService;
        this.cache = cache;
        this.table = compensation_schema_1.employeeCompensations;
    }
    tags(scope) {
        return [
            `employee:${scope}:compensation`,
            `employee:${scope}:compensation:list`,
            `employee:${scope}:compensation:detail`,
        ];
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
                .set({ ...dto, updatedAt: new Date() })
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
                    entity: 'EmployeeCompensation',
                    details: 'Created new employee compensation',
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
                .values({
                employeeId,
                payFrequency: dto.payFrequency || 'monthly',
                currency: dto.currency,
                grossSalary: dto.grossSalary * 100,
                effectiveDate: new Date().toISOString(),
            })
                .returning()
                .execute();
            await this.auditService.logAction({
                action: 'create',
                entity: 'EmployeeCompensation',
                details: 'Created new employee compensation',
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
    async create(employeeId, dto, userId, ip, trx) {
        const [compensation] = await this.db
            .select()
            .from(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.employeeId, employeeId))
            .execute();
        if (compensation && compensation.grossSalary === dto.grossSalary) {
            throw new common_1.NotFoundException(`compensation for employee ${employeeId} with ${dto.grossSalary} already exists`);
        }
        const [created] = await (trx ?? this.db)
            .insert(this.table)
            .values({
            employeeId,
            payFrequency: dto.payFrequency,
            currency: dto.currency,
            grossSalary: dto.grossSalary,
            effectiveDate: new Date().toISOString(),
        })
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'create',
            entity: 'EmployeeCompensation',
            details: 'Created new employee compensation',
            userId,
            entityId: employeeId,
            ipAddress: ip,
            changes: { ...dto },
        });
        await this.cache.bumpCompanyVersion(employeeId);
        await this.cache.bumpCompanyVersion('global');
        return created;
    }
    async findAll(employeeId) {
        return this.cache.getOrSetVersioned(employeeId, ['compensation', 'list', employeeId], async () => {
            const [compensation] = await this.db
                .select({
                id: this.table.id,
                employeeId: this.table.employeeId,
                grossSalary: this.table.grossSalary,
                payGroupId: employee_schema_1.employees.payGroupId,
                applyNhf: this.table.applyNHf,
                startDate: employee_schema_1.employees.employmentStartDate,
                endDate: employee_schema_1.employees.employmentEndDate,
            })
                .from(this.table)
                .innerJoin(employee_schema_1.employees, (0, drizzle_orm_1.eq)(employee_schema_1.employees.id, this.table.employeeId))
                .where((0, drizzle_orm_1.eq)(this.table.employeeId, employeeId))
                .execute();
            if (!compensation) {
                throw new common_1.NotFoundException(`compensation for employee ${employeeId} not found`);
            }
            return compensation;
        }, { tags: this.tags(employeeId) });
    }
    async findOne(compensationId) {
        return this.cache.getOrSetVersioned('global', ['compensation', 'detail', compensationId], async () => {
            const [compensation] = await this.db
                .select({
                id: this.table.id,
                employeeId: this.table.employeeId,
                grossSalary: this.table.grossSalary,
                payGroupId: employee_schema_1.employees.payGroupId,
                applyNhf: this.table.applyNHf,
            })
                .from(this.table)
                .leftJoin(employee_schema_1.employees, (0, drizzle_orm_1.eq)(employee_schema_1.employees.id, this.table.employeeId))
                .where((0, drizzle_orm_1.eq)(this.table.id, compensationId))
                .execute();
            if (!compensation) {
                throw new common_1.NotFoundException(`compensation for employee ${compensationId} not found`);
            }
            return compensation;
        }, { tags: this.tags('global') });
    }
    async update(compensationId, dto, userId, ip) {
        const [dependant] = await this.db
            .select()
            .from(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.id, compensationId))
            .execute();
        if (!dependant) {
            throw new common_1.NotFoundException(`compensation for employee ${compensationId} not found`);
        }
        const [updated] = await this.db
            .update(this.table)
            .set({ ...dto })
            .where((0, drizzle_orm_1.eq)(this.table.id, compensationId))
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
                entity: 'EmployeeCompensation',
                details: 'Updated employee compensation',
                userId,
                entityId: compensationId,
                ipAddress: ip,
                changes,
            });
        }
        await this.cache.bumpCompanyVersion(dependant.employeeId);
        await this.cache.bumpCompanyVersion('global');
        return updated;
    }
    async remove(compensationId) {
        const [existing] = await this.db
            .select()
            .from(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.id, compensationId))
            .execute();
        const result = await this.db
            .delete(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.id, compensationId))
            .returning({ id: this.table.id })
            .execute();
        if (!result.length) {
            throw new common_1.NotFoundException(`Profile for employee ${compensationId} not found`);
        }
        if (existing?.employeeId) {
            await this.cache.bumpCompanyVersion(existing.employeeId);
        }
        await this.cache.bumpCompanyVersion('global');
        return { deleted: true, id: result[0].id };
    }
};
exports.CompensationService = CompensationService;
exports.CompensationService = CompensationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        cache_service_1.CacheService])
], CompensationService);
//# sourceMappingURL=compensation.service.js.map