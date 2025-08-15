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
exports.DeductionsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../../../drizzle/schema");
const drizzle_orm_1 = require("drizzle-orm");
const audit_service_1 = require("../../audit/audit.service");
const deduction_schema_1 = require("../schema/deduction.schema");
const decimal_js_1 = require("decimal.js");
const cache_service_1 = require("../../../common/cache/cache.service");
let DeductionsService = class DeductionsService {
    constructor(db, auditService, cache) {
        this.db = db;
        this.auditService = auditService;
        this.cache = cache;
    }
    async getCompanyIdByEmployeeId(employeeId) {
        const [row] = await this.db
            .select({ companyId: schema_1.employees.companyId })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.eq)(schema_1.employees.id, employeeId))
            .limit(1)
            .execute();
        if (!row?.companyId) {
            throw new common_1.BadRequestException('Employee not found');
        }
        return row.companyId;
    }
    async getCompanyIdByEmployeeDeductionId(id) {
        const [row] = await this.db
            .select({
            employeeId: deduction_schema_1.employeeDeductions.employeeId,
        })
            .from(deduction_schema_1.employeeDeductions)
            .where((0, drizzle_orm_1.eq)(deduction_schema_1.employeeDeductions.id, id))
            .limit(1)
            .execute();
        if (!row?.employeeId) {
            throw new common_1.BadRequestException('Deduction not found');
        }
        const companyId = await this.getCompanyIdByEmployeeId(row.employeeId);
        return { companyId, employeeId: row.employeeId };
    }
    async getDeductionTypes() {
        return this.cache.getOrSetVersioned('global', ['deductionTypes', 'all'], async () => {
            return await this.db.select().from(deduction_schema_1.deductionTypes).execute();
        }, { tags: ['deductionTypes'] });
    }
    async findDeductionType(id) {
        return this.cache.getOrSetVersioned('global', ['deductionType', id], async () => {
            const rows = await this.db
                .select()
                .from(deduction_schema_1.deductionTypes)
                .where((0, drizzle_orm_1.eq)(deduction_schema_1.deductionTypes.id, id))
                .execute();
            if (!rows.length) {
                throw new common_1.BadRequestException('Deduction type not found');
            }
            return rows[0];
        }, { tags: ['deductionTypes', `deductionType:${id}`] });
    }
    async createDeductionType(dto, user) {
        const [created] = await this.db
            .insert(deduction_schema_1.deductionTypes)
            .values({
            name: dto.name,
            code: dto.code,
            systemDefined: dto.systemDefined,
            requiresMembership: dto.requiresMembership,
        })
            .returning({
            id: deduction_schema_1.deductionTypes.id,
            name: deduction_schema_1.deductionTypes.name,
            code: deduction_schema_1.deductionTypes.code,
        })
            .execute();
        if (user?.id) {
            await this.auditService.logAction({
                action: 'create',
                entity: 'deduction_type',
                entityId: created.id,
                userId: user.id,
                details: `Deduction type with ID ${created.id} was created.`,
                changes: {
                    name: dto.name,
                    code: dto.code,
                    systemDefined: dto.systemDefined,
                    requiresMembership: dto.requiresMembership,
                },
            });
        }
        await this.cache.bumpCompanyVersion('global');
        await this.cache.invalidateTags(['deductionTypes']);
        return created;
    }
    async updateDeductionType(user, dto, id) {
        await this.findDeductionType(id);
        const [updated] = await this.db
            .update(deduction_schema_1.deductionTypes)
            .set({
            name: dto.name,
            code: dto.code,
            systemDefined: dto.systemDefined,
            requiresMembership: dto.requiresMembership,
        })
            .where((0, drizzle_orm_1.eq)(deduction_schema_1.deductionTypes.id, id))
            .returning({
            id: deduction_schema_1.deductionTypes.id,
            name: deduction_schema_1.deductionTypes.name,
            code: deduction_schema_1.deductionTypes.code,
        })
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'deduction_type',
            entityId: id,
            userId: user.id,
            details: `Deduction type with ID ${id} was updated.`,
            changes: {
                name: dto.name,
                code: dto.code,
                systemDefined: dto.systemDefined,
                requiresMembership: dto.requiresMembership,
            },
        });
        await this.cache.bumpCompanyVersion('global');
        await this.cache.invalidateTags(['deductionTypes', `deductionType:${id}`]);
        return updated;
    }
    async deleteDeductionType(id, userId) {
        await this.findDeductionType(id);
        const [deleted] = await this.db
            .update(deduction_schema_1.deductionTypes)
            .set({ systemDefined: false })
            .where((0, drizzle_orm_1.eq)(deduction_schema_1.deductionTypes.id, id))
            .returning({
            id: deduction_schema_1.deductionTypes.id,
            name: deduction_schema_1.deductionTypes.name,
            code: deduction_schema_1.deductionTypes.code,
        })
            .execute();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'deduction_type',
            entityId: deleted.id,
            userId,
            details: `Deduction type with ID ${id} was deleted.`,
            changes: { systemDefined: false },
        });
        await this.cache.bumpCompanyVersion('global');
        await this.cache.invalidateTags(['deductionTypes', `deductionType:${id}`]);
        return 'Deduction type deleted successfully';
    }
    async getEmployeeDeductions(employeeId) {
        const companyId = await this.getCompanyIdByEmployeeId(employeeId);
        const list = await this.cache.getOrSetVersioned(companyId, ['employee', employeeId, 'deductions', 'all'], async () => {
            return await this.db
                .select()
                .from(deduction_schema_1.employeeDeductions)
                .where((0, drizzle_orm_1.eq)(deduction_schema_1.employeeDeductions.employeeId, employeeId))
                .execute();
        }, { tags: [`employee:${employeeId}:deductions`, 'deductions:company'] });
        if (!list.length) {
            throw new common_1.BadRequestException('No deductions found for this employee');
        }
        return list;
    }
    async assignDeductionToEmployee(user, dto) {
        await this.findDeductionType(dto.deductionTypeId);
        const [created] = await this.db
            .insert(deduction_schema_1.employeeDeductions)
            .values({
            employeeId: dto.employeeId,
            deductionTypeId: dto.deductionTypeId,
            rateType: dto.rateType,
            rateValue: dto.rateValue,
            startDate: dto.startDate,
            endDate: dto.endDate,
            metadata: dto.metadata ?? {},
            isActive: dto.isActive ?? true,
        })
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'create',
            entity: 'employee_deduction',
            entityId: created.id,
            userId: user.id,
            details: `Employee deduction assigned to ${dto.employeeId}`,
            changes: dto,
        });
        const companyId = await this.getCompanyIdByEmployeeId(dto.employeeId);
        await this.cache.bumpCompanyVersion(companyId);
        await this.cache.invalidateTags([
            'deductions:company',
            `employee:${dto.employeeId}:deductions`,
        ]);
        return created;
    }
    async updateEmployeeDeduction(user, id, dto) {
        const existing = await this.db
            .select()
            .from(deduction_schema_1.employeeDeductions)
            .where((0, drizzle_orm_1.eq)(deduction_schema_1.employeeDeductions.id, id))
            .execute();
        if (!existing.length)
            throw new common_1.BadRequestException('Deduction not found');
        const [updated] = await this.db
            .update(deduction_schema_1.employeeDeductions)
            .set({
            rateType: dto.rateType,
            rateValue: dto.rateValue,
            startDate: dto.startDate,
            endDate: dto.endDate,
            metadata: dto.metadata,
            isActive: dto.isActive,
        })
            .where((0, drizzle_orm_1.eq)(deduction_schema_1.employeeDeductions.id, id))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'employee_deduction',
            entityId: updated.id,
            userId: user.id,
            details: `Updated employee deduction ${updated.id}`,
            changes: dto,
        });
        const { companyId, employeeId } = await this.getCompanyIdByEmployeeDeductionId(id);
        await this.cache.bumpCompanyVersion(companyId);
        await this.cache.invalidateTags([
            'deductions:company',
            `employee:${employeeId}:deductions`,
        ]);
        return updated;
    }
    async removeEmployeeDeduction(id, userId) {
        const [updated] = await this.db
            .update(deduction_schema_1.employeeDeductions)
            .set({ isActive: false })
            .where((0, drizzle_orm_1.eq)(deduction_schema_1.employeeDeductions.id, id))
            .returning()
            .execute();
        if (!updated)
            throw new common_1.BadRequestException('Deduction not found');
        await this.auditService.logAction({
            action: 'delete',
            entity: 'employee_deduction',
            entityId: id,
            userId,
            details: `Deactivated deduction ${id}`,
            changes: { isActive: false },
        });
        const { companyId, employeeId } = await this.getCompanyIdByEmployeeDeductionId(id);
        await this.cache.bumpCompanyVersion(companyId);
        await this.cache.invalidateTags([
            'deductions:company',
            `employee:${employeeId}:deductions`,
        ]);
        return { message: 'Employee deduction deactivated successfully' };
    }
    async getAllEmployeeDeductionsForCompany(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['company', 'deductions', 'active', 'allEmployees'], async () => {
            return await this.db
                .select({
                id: deduction_schema_1.employeeDeductions.id,
                employeeId: deduction_schema_1.employeeDeductions.employeeId,
                rateType: deduction_schema_1.employeeDeductions.rateType,
                rateValue: deduction_schema_1.employeeDeductions.rateValue,
                deductionTypeName: deduction_schema_1.deductionTypes.name,
                isActive: deduction_schema_1.employeeDeductions.isActive,
                startDate: deduction_schema_1.employeeDeductions.startDate,
                endDate: deduction_schema_1.employeeDeductions.endDate,
                employeeName: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
            })
                .from(deduction_schema_1.employeeDeductions)
                .leftJoin(deduction_schema_1.deductionTypes, (0, drizzle_orm_1.eq)(deduction_schema_1.employeeDeductions.deductionTypeId, deduction_schema_1.deductionTypes.id))
                .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(deduction_schema_1.employeeDeductions.employeeId, schema_1.employees.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId), (0, drizzle_orm_1.eq)(deduction_schema_1.employeeDeductions.isActive, true)))
                .execute();
        }, { tags: ['deductions:company'] });
    }
    async processVoluntaryDeductionsFromPayroll(payrollRecords, payrollRunId, companyId) {
        const types = await this.getDeductionTypes();
        const deductionTypeMap = new Map();
        for (const dt of types) {
            deductionTypeMap.set(dt.id, dt.name);
        }
        const allRows = [];
        for (const record of payrollRecords) {
            const voluntaryDeductions = Array.isArray(record.voluntaryDeductions)
                ? record.voluntaryDeductions
                : [];
            if (!voluntaryDeductions.length)
                continue;
            for (const { amount, typeId } of voluntaryDeductions) {
                const amt = new decimal_js_1.default(amount);
                if (amt.lte(0))
                    continue;
                const deductionName = deductionTypeMap.get(typeId) || `Unknown-${typeId}`;
                allRows.push({
                    employeeId: record.employeeId,
                    employeeName: `${record.firstName} ${record.lastName}`,
                    deductionName,
                    payrollId: payrollRunId,
                    payrollMonth: String(record.payrollMonth),
                    amount: amt.toFixed(2),
                    companyId,
                });
            }
        }
        if (allRows.length > 0) {
            await this.db.insert(deduction_schema_1.filingVoluntaryDeductions).values(allRows).execute();
        }
        await this.cache.bumpCompanyVersion(companyId);
        const tags = new Set(['deductions:company', 'voluntary:company']);
        for (const row of allRows) {
            tags.add(`employee:${row.employeeId}:deductions`);
            tags.add(`employee:${row.employeeId}:voluntary`);
        }
        await this.cache.invalidateTags(Array.from(tags));
        return { inserted: allRows.length };
    }
};
exports.DeductionsService = DeductionsService;
exports.DeductionsService = DeductionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        cache_service_1.CacheService])
], DeductionsService);
//# sourceMappingURL=deductions.service.js.map