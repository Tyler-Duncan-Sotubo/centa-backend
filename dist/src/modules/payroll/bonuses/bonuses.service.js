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
exports.BonusesService = void 0;
const common_1 = require("@nestjs/common");
const payroll_bonuses_schema_1 = require("../schema/payroll-bonuses.schema");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const audit_service_1 = require("../../audit/audit.service");
const schema_1 = require("../../../drizzle/schema");
const drizzle_orm_1 = require("drizzle-orm");
let BonusesService = class BonusesService {
    constructor(db, auditService) {
        this.db = db;
        this.auditService = auditService;
    }
    async create(user, dto) {
        const result = await this.db
            .insert(payroll_bonuses_schema_1.payrollBonuses)
            .values({
            bonusType: dto.bonusType,
            companyId: user.companyId,
            createdBy: user.id,
            effectiveDate: dto.effectiveDate,
            amount: dto.amount,
            employeeId: dto.employeeId,
        })
            .returning()
            .execute();
        await this.auditService.logAction({
            userId: user.id,
            action: 'create',
            entity: 'payroll_bonuses',
            details: 'Created a bonus',
            entityId: result[0].id,
            changes: {
                bonusType: dto.bonusType,
                amount: dto.amount,
                employeeId: dto.employeeId,
                effectiveDate: dto.effectiveDate,
            },
        });
        return result;
    }
    async findAll(companyId) {
        const result = await this.db
            .select({
            id: payroll_bonuses_schema_1.payrollBonuses.id,
            employee_id: payroll_bonuses_schema_1.payrollBonuses.employeeId,
            amount: payroll_bonuses_schema_1.payrollBonuses.amount,
            bonus_type: payroll_bonuses_schema_1.payrollBonuses.bonusType,
            first_name: schema_1.employees.firstName,
            last_name: schema_1.employees.lastName,
            effective_date: payroll_bonuses_schema_1.payrollBonuses.effectiveDate,
            status: payroll_bonuses_schema_1.payrollBonuses.status,
        })
            .from(payroll_bonuses_schema_1.payrollBonuses)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_bonuses_schema_1.payrollBonuses.companyId, companyId), (0, drizzle_orm_1.eq)(payroll_bonuses_schema_1.payrollBonuses.status, 'active')))
            .leftJoin(schema_1.employees, (0, drizzle_orm_1.eq)(payroll_bonuses_schema_1.payrollBonuses.employeeId, schema_1.employees.id))
            .execute();
        return result;
    }
    async findOne(bonusId) {
        const result = await this.db
            .select({})
            .from(payroll_bonuses_schema_1.payrollBonuses)
            .where((0, drizzle_orm_1.eq)(payroll_bonuses_schema_1.payrollBonuses.id, bonusId))
            .execute();
        if (result.length === 0) {
            throw new common_1.NotFoundException('Bonus not found');
        }
        return result;
    }
    async findAllEmployeeBonuses(companyId, employee_id) {
        const result = await this.db
            .select({
            id: payroll_bonuses_schema_1.payrollBonuses.id,
            employee_id: payroll_bonuses_schema_1.payrollBonuses.employeeId,
            amount: payroll_bonuses_schema_1.payrollBonuses.amount,
            bonus_type: payroll_bonuses_schema_1.payrollBonuses.bonusType,
            effective_date: payroll_bonuses_schema_1.payrollBonuses.effectiveDate,
        })
            .from(payroll_bonuses_schema_1.payrollBonuses)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_bonuses_schema_1.payrollBonuses.companyId, companyId), (0, drizzle_orm_1.eq)(payroll_bonuses_schema_1.payrollBonuses.employeeId, employee_id), (0, drizzle_orm_1.eq)(payroll_bonuses_schema_1.payrollBonuses.status, 'active')))
            .execute();
        return result;
    }
    async update(bonusId, dto, user) {
        await this.findOne(bonusId);
        const [updated] = await this.db
            .update(payroll_bonuses_schema_1.payrollBonuses)
            .set({
            amount: dto.amount,
            bonusType: dto.bonusType,
        })
            .where((0, drizzle_orm_1.eq)(payroll_bonuses_schema_1.payrollBonuses.id, bonusId))
            .returning()
            .execute();
        await this.auditService.logAction({
            userId: user.id,
            action: 'update',
            entity: 'payroll_bonuses',
            details: 'Updated a bonus',
            entityId: bonusId,
            changes: {
                amount: dto.amount,
                bonusType: dto.bonusType,
            },
        });
        return updated;
    }
    async remove(user, bonusId) {
        await this.findOne(bonusId);
        const result = await this.db
            .update(payroll_bonuses_schema_1.payrollBonuses)
            .set({
            status: 'inactive',
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_bonuses_schema_1.payrollBonuses.companyId, user.companyId), (0, drizzle_orm_1.eq)(payroll_bonuses_schema_1.payrollBonuses.id, bonusId)))
            .returning()
            .execute();
        await this.auditService.logAction({
            userId: user.id,
            action: 'delete',
            entity: 'payroll_bonuses',
            details: 'Deleted a bonus',
            entityId: bonusId,
            changes: {
                status: 'inactive',
            },
        });
        return result;
    }
};
exports.BonusesService = BonusesService;
exports.BonusesService = BonusesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService])
], BonusesService);
//# sourceMappingURL=bonuses.service.js.map