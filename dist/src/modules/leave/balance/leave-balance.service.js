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
exports.LeaveBalanceService = void 0;
const common_1 = require("@nestjs/common");
const leave_balance_schema_1 = require("../schema/leave-balance.schema");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const audit_service_1 = require("../../audit/audit.service");
const schema_1 = require("../../../drizzle/schema");
const leave_types_schema_1 = require("../schema/leave-types.schema");
let LeaveBalanceService = class LeaveBalanceService {
    constructor(db, auditService) {
        this.db = db;
        this.auditService = auditService;
        this.table = leave_balance_schema_1.leaveBalances;
    }
    async create(leaveTypeId, companyId, employeeId, year, entitlement, used, balance) {
        const leaveBalance = await this.db
            .insert(this.table)
            .values({
            leaveTypeId,
            companyId,
            employeeId,
            year,
            entitlement,
            used,
            balance,
        })
            .returning()
            .execute();
        return leaveBalance;
    }
    async findAll(companyId) {
        const results = await this.db
            .select({
            employeeId: this.table.employeeId,
            companyId: schema_1.employees.companyId,
            name: (0, drizzle_orm_1.sql) `concat(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
            department: schema_1.departments.name,
            jobRole: schema_1.jobRoles.title,
            totalBalance: (0, drizzle_orm_1.sql) `SUM(${this.table.balance})`,
        })
            .from(this.table)
            .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(this.table.employeeId, schema_1.employees.id))
            .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.employees.departmentId, schema_1.departments.id))
            .leftJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(schema_1.employees.jobRoleId, schema_1.jobRoles.id))
            .where((0, drizzle_orm_1.eq)(this.table.companyId, companyId))
            .groupBy(this.table.employeeId, schema_1.employees.companyId, schema_1.employees.firstName, schema_1.employees.lastName, schema_1.departments.name, schema_1.jobRoles.title)
            .execute();
        return results;
    }
    async findByEmployeeId(employeeId) {
        const currentYear = new Date().getFullYear();
        const results = await this.db
            .select({
            leaveTypeId: leave_types_schema_1.leaveTypes.id,
            leaveTypeName: leave_types_schema_1.leaveTypes.name,
            year: this.table.year,
            entitlement: this.table.entitlement,
            used: this.table.used,
            balance: this.table.balance,
        })
            .from(this.table)
            .innerJoin(leave_types_schema_1.leaveTypes, (0, drizzle_orm_1.eq)(this.table.leaveTypeId, leave_types_schema_1.leaveTypes.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(this.table.employeeId, employeeId), (0, drizzle_orm_1.eq)(this.table.year, currentYear)))
            .orderBy(leave_types_schema_1.leaveTypes.name)
            .execute();
        return results;
    }
    async findBalanceByLeaveType(companyId, employeeId, leaveTypeId, currentYear) {
        const [balance] = await this.db
            .select()
            .from(this.table)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(this.table.companyId, companyId), (0, drizzle_orm_1.eq)(this.table.leaveTypeId, leaveTypeId), (0, drizzle_orm_1.eq)(this.table.year, Number(currentYear)), (0, drizzle_orm_1.eq)(this.table.employeeId, employeeId)));
        if (!balance) {
            return null;
        }
        return balance;
    }
    async update(balanceId, dto) {
        const existingLeaveBalance = await this.db
            .select()
            .from(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.id, balanceId))
            .execute();
        if (existingLeaveBalance.length === 0) {
            throw new common_1.NotFoundException(`Leave balance not found`);
        }
        const [updatedLeaveBalance] = await this.db
            .update(this.table)
            .set(dto)
            .where((0, drizzle_orm_1.eq)(this.table.id, balanceId))
            .returning()
            .execute();
        return updatedLeaveBalance;
    }
    async updateLeaveBalanceOnLeaveApproval(leaveTypeId, employeeId, year, totalLeaveDays, userId) {
        const [leaveBalance] = await this.db
            .select()
            .from(this.table)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(this.table.leaveTypeId, leaveTypeId), (0, drizzle_orm_1.eq)(this.table.year, year), (0, drizzle_orm_1.eq)(this.table.employeeId, employeeId)))
            .execute();
        if (!leaveBalance) {
            throw new common_1.NotFoundException(`Leave balance not found`);
        }
        const updatedUsed = Number(leaveBalance.used) + Number(totalLeaveDays);
        const updatedBalance = Number(leaveBalance.balance) - Number(totalLeaveDays);
        const updatedLeaveBalance = await this.db
            .update(this.table)
            .set({
            used: updatedUsed.toFixed(2),
            balance: updatedBalance.toFixed(2),
        })
            .where((0, drizzle_orm_1.eq)(this.table.id, leaveBalance.id))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'leave_balance',
            entityId: leaveBalance.id,
            details: `Leave balance updated for employee ${employeeId} for leave type ${leaveTypeId} for year ${year}`,
            userId,
            changes: {
                used: leaveBalance.used + totalLeaveDays,
                balance: (Number(leaveBalance.balance) - Number(totalLeaveDays)).toString(),
            },
        });
        return updatedLeaveBalance;
    }
};
exports.LeaveBalanceService = LeaveBalanceService;
exports.LeaveBalanceService = LeaveBalanceService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService])
], LeaveBalanceService);
//# sourceMappingURL=leave-balance.service.js.map