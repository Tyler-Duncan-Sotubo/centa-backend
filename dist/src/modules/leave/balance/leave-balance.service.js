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
var LeaveBalanceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveBalanceService = void 0;
const common_1 = require("@nestjs/common");
const leave_balance_schema_1 = require("../schema/leave-balance.schema");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const audit_service_1 = require("../../audit/audit.service");
const schema_1 = require("../../../drizzle/schema");
const leave_types_schema_1 = require("../schema/leave-types.schema");
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../../common/cache/cache.service");
let LeaveBalanceService = LeaveBalanceService_1 = class LeaveBalanceService {
    constructor(db, auditService, logger, cache) {
        this.db = db;
        this.auditService = auditService;
        this.logger = logger;
        this.cache = cache;
        this.table = leave_balance_schema_1.leaveBalances;
        this.logger.setContext(LeaveBalanceService_1.name);
    }
    allKey(companyId) {
        return `company:${companyId}:leaveBalances:all-agg`;
    }
    empYearKey(employeeId, year) {
        return `emp:${employeeId}:leaveBalances:year:${year}`;
    }
    empTypeYearKey(companyId, employeeId, leaveTypeId, year) {
        return `company:${companyId}:emp:${employeeId}:leaveType:${leaveTypeId}:year:${year}`;
    }
    async burstAfterChange(opts) {
        const jobs = [];
        jobs.push(this.cache.del(this.allKey(opts.companyId)));
        if (opts.employeeId && opts.year != null) {
            jobs.push(this.cache.del(this.empYearKey(opts.employeeId, opts.year)));
        }
        if (opts.companyId &&
            opts.employeeId &&
            opts.leaveTypeId &&
            opts.year != null) {
            jobs.push(this.cache.del(this.empTypeYearKey(opts.companyId, opts.employeeId, opts.leaveTypeId, opts.year)));
        }
        await Promise.allSettled(jobs);
        this.logger.debug({ ...opts }, 'cache:burst:leave-balance');
    }
    async create(leaveTypeId, companyId, employeeId, year, entitlement, used, balance) {
        this.logger.info({ companyId, employeeId, leaveTypeId, year }, 'leaveBalance:create:start');
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
        await this.burstAfterChange({ companyId, employeeId, leaveTypeId, year });
        this.logger.info({ id: leaveBalance[0]?.id }, 'leaveBalance:create:done');
        return leaveBalance;
    }
    async findAll(companyId) {
        const key = this.allKey(companyId);
        this.logger.debug({ companyId, key }, 'leaveBalance:findAll:cache:get');
        return this.cache.getOrSetCache(key, async () => {
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
            this.logger.debug({ companyId, count: results.length }, 'leaveBalance:findAll:db:done');
            return results;
        });
    }
    async findByEmployeeId(employeeId) {
        const currentYear = new Date().getFullYear();
        const key = this.empYearKey(employeeId, currentYear);
        this.logger.debug({ employeeId, currentYear, key }, 'leaveBalance:findByEmployeeId:cache:get');
        return this.cache.getOrSetCache(key, async () => {
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
            this.logger.debug({ employeeId, count: results.length }, 'leaveBalance:findByEmployeeId:db:done');
            return results;
        });
    }
    async findBalanceByLeaveType(companyId, employeeId, leaveTypeId, currentYear) {
        const key = this.empTypeYearKey(companyId, employeeId, leaveTypeId, currentYear);
        this.logger.debug({ companyId, employeeId, leaveTypeId, currentYear, key }, 'leaveBalance:findByType:cache:get');
        const row = await this.cache.getOrSetCache(key, async () => {
            const [balance] = await this.db
                .select()
                .from(this.table)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(this.table.companyId, companyId), (0, drizzle_orm_1.eq)(this.table.leaveTypeId, leaveTypeId), (0, drizzle_orm_1.eq)(this.table.year, Number(currentYear)), (0, drizzle_orm_1.eq)(this.table.employeeId, employeeId)))
                .execute();
            return balance ?? null;
        });
        if (!row) {
            this.logger.warn({ companyId, employeeId, leaveTypeId, currentYear }, 'leaveBalance:findByType:not-found');
            return null;
        }
        return row;
    }
    async update(balanceId, dto) {
        this.logger.info({ balanceId }, 'leaveBalance:update:start');
        const existingLeaveBalance = await this.db
            .select()
            .from(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.id, balanceId))
            .execute();
        if (existingLeaveBalance.length === 0) {
            this.logger.warn({ balanceId }, 'leaveBalance:update:not-found');
            throw new common_1.NotFoundException(`Leave balance not found`);
        }
        const [updatedLeaveBalance] = await this.db
            .update(this.table)
            .set(dto)
            .where((0, drizzle_orm_1.eq)(this.table.id, balanceId))
            .returning()
            .execute();
        await this.burstAfterChange({
            companyId: updatedLeaveBalance.companyId,
            employeeId: updatedLeaveBalance.employeeId,
            leaveTypeId: updatedLeaveBalance.leaveTypeId,
            year: updatedLeaveBalance.year,
        });
        this.logger.info({ balanceId }, 'leaveBalance:update:done');
        return updatedLeaveBalance;
    }
    async updateLeaveBalanceOnLeaveApproval(leaveTypeId, employeeId, year, totalLeaveDays, userId) {
        this.logger.info({ employeeId, leaveTypeId, year, totalLeaveDays }, 'leaveBalance:onApproval:start');
        const [leaveBalance] = await this.db
            .select()
            .from(this.table)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(this.table.leaveTypeId, leaveTypeId), (0, drizzle_orm_1.eq)(this.table.year, year), (0, drizzle_orm_1.eq)(this.table.employeeId, employeeId)))
            .execute();
        if (!leaveBalance) {
            this.logger.warn({ employeeId, leaveTypeId, year }, 'leaveBalance:onApproval:not-found');
            throw new common_1.NotFoundException(`Leave balance not found`);
        }
        const usedNum = Number(leaveBalance.used);
        const daysNum = Number(totalLeaveDays);
        const balNum = Number(leaveBalance.balance);
        const updatedUsed = usedNum + daysNum;
        const updatedBalance = balNum - daysNum;
        const [updated] = await this.db
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
                used: updated.used,
                balance: updated.balance,
            },
        });
        await this.burstAfterChange({
            companyId: updated.companyId,
            employeeId,
            leaveTypeId,
            year,
        });
        this.logger.info({ id: updated.id, employeeId, leaveTypeId, year }, 'leaveBalance:onApproval:done');
        return updated;
    }
};
exports.LeaveBalanceService = LeaveBalanceService;
exports.LeaveBalanceService = LeaveBalanceService = LeaveBalanceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], LeaveBalanceService);
//# sourceMappingURL=leave-balance.service.js.map