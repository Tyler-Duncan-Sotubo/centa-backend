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
exports.LeaveRequestService = void 0;
const common_1 = require("@nestjs/common");
const leave_requests_schema_1 = require("../schema/leave-requests.schema");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const leave_policy_service_1 = require("../policy/leave-policy.service");
const leave_settings_service_1 = require("../settings/leave-settings.service");
const employees_service_1 = require("../../core/employees/employees.service");
const audit_service_1 = require("../../audit/audit.service");
const holidays_service_1 = require("../holidays/holidays.service");
const drizzle_orm_1 = require("drizzle-orm");
const leave_balance_service_1 = require("../balance/leave-balance.service");
const schema_1 = require("../../../drizzle/schema");
const leave_types_schema_1 = require("../schema/leave-types.schema");
const blocked_days_service_1 = require("../blocked-days/blocked-days.service");
const reserved_days_service_1 = require("../reserved-days/reserved-days.service");
const cache_service_1 = require("../../../common/cache/cache.service");
let LeaveRequestService = class LeaveRequestService {
    constructor(db, leavePolicyService, leaveSettingsService, leaveBalanceService, employeesService, auditService, holidayService, blockedDaysService, reservedDaysService, cache) {
        this.db = db;
        this.leavePolicyService = leavePolicyService;
        this.leaveSettingsService = leaveSettingsService;
        this.leaveBalanceService = leaveBalanceService;
        this.employeesService = employeesService;
        this.auditService = auditService;
        this.holidayService = holidayService;
        this.blockedDaysService = blockedDaysService;
        this.reservedDaysService = reservedDaysService;
        this.cache = cache;
    }
    tags(companyId) {
        return [
            `company:${companyId}:leave`,
            `company:${companyId}:leave:requests`,
        ];
    }
    async applyForLeave(dto, user, ip) {
        const { companyId } = user;
        const employee = await this.employeesService.findEmployeeSummaryByUserId(dto.employeeId);
        const leavePolicy = await this.leavePolicyService.findLeavePoliciesByLeaveTypeId(companyId, dto.leaveTypeId);
        if (leavePolicy.onlyConfirmedEmployees && !employee.confirmed) {
            const allowUnconfirmed = await this.leaveSettingsService.allowUnconfirmedLeave(companyId);
            if (!allowUnconfirmed) {
                throw new common_1.ForbiddenException('Only confirmed employees can request this leave.');
            }
            const allowedLeaveTypes = await this.leaveSettingsService.allowedLeaveTypesForUnconfirmed(companyId);
            if (!allowedLeaveTypes.includes(leavePolicy.leaveTypeId)) {
                throw new common_1.ForbiddenException('You are not allowed to request this leave type.');
            }
        }
        if (leavePolicy.genderEligibility !== 'any' &&
            employee.gender !== leavePolicy.genderEligibility) {
            throw new common_1.ForbiddenException(`Only ${leavePolicy.genderEligibility} employees can request this leave.`);
        }
        const eligibility = leavePolicy.eligibilityRules ?? {};
        if (eligibility.countries &&
            employee.country !== null &&
            !eligibility.countries.includes(employee.country)) {
            throw new common_1.ForbiddenException('You are not eligible based on your country.');
        }
        if (eligibility.departments &&
            !eligibility.departments.includes(employee.department)) {
            throw new common_1.ForbiddenException('You are not eligible based on your department.');
        }
        if (eligibility.employeeLevels &&
            employee.level !== null &&
            !eligibility.employeeLevels.includes(employee.level)) {
            throw new common_1.ForbiddenException('You are not eligible based on your employee level.');
        }
        if (!leavePolicy.isSplittable &&
            this.leaveIsSplit(dto.startDate, dto.endDate)) {
            throw new common_1.BadRequestException('This leave must be taken as a continuous period.');
        }
        const minNoticeDays = await this.leaveSettingsService.getMinNoticeDays(companyId);
        if (!this.isEnoughNotice(dto.startDate, minNoticeDays)) {
            throw new common_1.BadRequestException(`You must apply for leave at least ${minNoticeDays} days in advance.`);
        }
        const maxConsecutive = await this.leaveSettingsService.getMaxConsecutiveLeaveDays(companyId);
        const daysRequested = this.calculateDurationInDays(dto.startDate, dto.endDate);
        if (daysRequested > maxConsecutive) {
            throw new common_1.BadRequestException(`You cannot take more than ${maxConsecutive} consecutive leave days.`);
        }
        const multiLevel = await this.leaveSettingsService.isMultiLevelApproval(companyId);
        let approverId = '';
        const approvalChain = [];
        if (multiLevel) {
            const chain = await this.leaveSettingsService.getApprovalChain(companyId);
            let level = 0;
            for (const role of chain) {
                const approver = await this.determineApproverByRole(employee.id, companyId, role);
                if (!approver) {
                    throw new common_1.NotFoundException(`Approver for role '${role}' not found.`);
                }
                approvalChain.push({
                    level,
                    approverRole: role,
                    approverId: approver,
                    status: 'pending',
                    actionedAt: null,
                });
                level++;
            }
            approverId = approvalChain[0].approverId;
        }
        else {
            const approverSetting = await this.leaveSettingsService.getApproverSetting(companyId);
            approverId = await this.determineApproverByRole(employee.id, companyId, approverSetting);
        }
        const requestedDates = this.listDatesBetween(dto.startDate, dto.endDate);
        const blockedDays = await this.blockedDaysService.getBlockedDates(companyId);
        const blockedDate = requestedDates.find((date) => blockedDays.includes(date));
        if (blockedDate) {
            throw new common_1.BadRequestException(`Cannot request leave on blocked day: ${blockedDate}`);
        }
        const reservedDays = await this.reservedDaysService.getReservedDates(companyId, employee.id);
        const reservedDate = requestedDates.find((date) => reservedDays.includes(date));
        if (reservedDate) {
            throw new common_1.BadRequestException(`Cannot request leave on reserved day: ${reservedDate}`);
        }
        const excludeWeekends = await this.leaveSettingsService.excludeWeekends(companyId);
        const weekendDays = await this.leaveSettingsService.getWeekendDays(companyId);
        const excludePublicHolidays = await this.leaveSettingsService.excludePublicHolidays(companyId);
        const effectiveLeaveDays = await this.calculateEffectiveLeaveDays(companyId, requestedDates, excludeWeekends, weekendDays, excludePublicHolidays, dto.partialDay);
        if (effectiveLeaveDays <= 0) {
            throw new common_1.BadRequestException('No effective leave days available for the requested period.');
        }
        const leaveBalance = await this.leaveBalanceService.findBalanceByLeaveType(companyId, employee.id, dto.leaveTypeId, new Date().getFullYear());
        if (!leaveBalance) {
            throw new common_1.BadRequestException('No leave balance found for this leave type.');
        }
        const availableBalance = Number(leaveBalance.balance);
        const allowNegativeBalance = await this.leaveSettingsService.allowNegativeBalance(companyId);
        if (!allowNegativeBalance && availableBalance < effectiveLeaveDays) {
            throw new common_1.ForbiddenException(`Insufficient leave balance. You have ${availableBalance} days left.`);
        }
        const [leaveRequest] = await this.db
            .insert(leave_requests_schema_1.leaveRequests)
            .values({
            companyId,
            employeeId: employee.id,
            leaveTypeId: dto.leaveTypeId,
            startDate: dto.startDate,
            endDate: dto.endDate,
            reason: dto.reason,
            status: 'pending',
            approverId,
            totalDays: effectiveLeaveDays.toString(),
            requestedAt: new Date(),
            partialDay: dto.partialDay,
            approvalChain,
        })
            .returning();
        await this.auditService.logAction({
            action: 'create',
            entity: 'leave_request',
            entityId: leaveRequest.id,
            userId: employee.userId,
            ipAddress: ip,
            details: 'Leave request created',
            changes: {
                companyId,
                employeeId: employee.id,
                leaveTypeId: dto.leaveTypeId,
                startDate: dto.startDate,
                endDate: dto.endDate,
                reason: dto.reason,
                status: 'pending',
                approverId,
            },
        });
        await this.cache.bumpCompanyVersion(companyId);
        return leaveRequest;
    }
    async determineApproverByRole(employeeId, companyId, role) {
        if (role === 'manager') {
            return await this.employeesService.findManagerByEmployeeId(employeeId, companyId);
        }
        if (role === 'hr_manager') {
            return await this.employeesService.findHrRepresentative(companyId);
        }
        if (role === 'super_admin') {
            return await this.employeesService.findSuperAdminUser(companyId);
        }
        throw new common_1.BadRequestException(`Unsupported approver role: ${role}`);
    }
    leaveIsSplit(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays < 0;
    }
    isEnoughNotice(startDate, minNoticeDays) {
        const start = new Date(startDate);
        const now = new Date();
        const diffDays = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= minNoticeDays;
    }
    calculateDurationInDays(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays + 1;
    }
    listDatesBetween(start, end) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const dates = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            dates.push(d.toISOString().substring(0, 10));
        }
        return dates;
    }
    async calculateEffectiveLeaveDays(companyId, requestedDates, excludeWeekends, weekendDays, excludePublicHolidays, partialDay) {
        let effectiveDates = [...requestedDates];
        if (excludeWeekends) {
            const weekendSet = new Set(weekendDays.map((d) => d.toLowerCase()));
            effectiveDates = effectiveDates.filter((dateStr) => {
                const date = new Date(dateStr);
                const dayName = date
                    .toLocaleDateString('en-US', { weekday: 'long' })
                    .toLowerCase();
                return !weekendSet.has(dayName);
            });
        }
        if (excludePublicHolidays) {
            const startDate = requestedDates[0];
            const end = requestedDates[requestedDates.length - 1];
            const holidaysInRange = await this.holidayService.listHolidaysInRange(companyId, startDate, end);
            const holidayDates = new Set(holidaysInRange.map((h) => h.date));
            effectiveDates = effectiveDates.filter((d) => !holidayDates.has(d));
        }
        let totalDays = effectiveDates.length;
        if (partialDay && totalDays === 1) {
            totalDays = 0.5;
        }
        return totalDays;
    }
    async findAll(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['leave', 'requests', 'list'], async () => {
            const rows = await this.db
                .select({
                employeeId: leave_requests_schema_1.leaveRequests.employeeId,
                requestId: leave_requests_schema_1.leaveRequests.id,
                employeeName: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
                leaveType: leave_types_schema_1.leaveTypes.name,
                startDate: leave_requests_schema_1.leaveRequests.startDate,
                endDate: leave_requests_schema_1.leaveRequests.endDate,
                status: leave_requests_schema_1.leaveRequests.status,
                reason: leave_requests_schema_1.leaveRequests.reason,
                department: schema_1.departments.name,
                jobRole: schema_1.jobRoles.title,
                totalDays: leave_requests_schema_1.leaveRequests.totalDays,
            })
                .from(leave_requests_schema_1.leaveRequests)
                .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.employeeId, schema_1.employees.id))
                .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.employees.departmentId, schema_1.departments.id))
                .leftJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(schema_1.employees.jobRoleId, schema_1.jobRoles.id))
                .innerJoin(leave_types_schema_1.leaveTypes, (0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.leaveTypeId, leave_types_schema_1.leaveTypes.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.companyId, companyId)))
                .execute();
            if (!rows)
                throw new common_1.NotFoundException('Leave requests not found');
            return rows;
        }, { tags: this.tags(companyId) });
    }
    async findAllByEmployeeId(employeeId, companyId) {
        return this.cache.getOrSetVersioned(companyId, ['leave', 'requests', 'by-employee', employeeId], async () => {
            const rows = await this.db
                .select({
                requestId: leave_requests_schema_1.leaveRequests.id,
                employeeId: leave_requests_schema_1.leaveRequests.employeeId,
                leaveType: leave_types_schema_1.leaveTypes.name,
                startDate: leave_requests_schema_1.leaveRequests.startDate,
                endDate: leave_requests_schema_1.leaveRequests.endDate,
                status: leave_requests_schema_1.leaveRequests.status,
                reason: leave_requests_schema_1.leaveRequests.reason,
            })
                .from(leave_requests_schema_1.leaveRequests)
                .innerJoin(leave_types_schema_1.leaveTypes, (0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.leaveTypeId, leave_types_schema_1.leaveTypes.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.employeeId, employeeId), (0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.companyId, companyId)))
                .execute();
            if (!rows)
                throw new common_1.NotFoundException('Leave requests not found');
            return rows;
        }, { tags: this.tags(companyId) });
    }
    async findOneById(leaveRequestId, companyId) {
        return this.cache.getOrSetVersioned(companyId, ['leave', 'requests', 'one', leaveRequestId], async () => {
            const [row] = await this.db
                .select({
                requestId: leave_requests_schema_1.leaveRequests.id,
                status: leave_requests_schema_1.leaveRequests.status,
            })
                .from(leave_requests_schema_1.leaveRequests)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.id, leaveRequestId), (0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.companyId, companyId)))
                .execute();
            if (!row) {
                throw new common_1.NotFoundException('Leave request not found');
            }
            return row;
        }, { tags: this.tags(companyId) });
    }
};
exports.LeaveRequestService = LeaveRequestService;
exports.LeaveRequestService = LeaveRequestService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, leave_policy_service_1.LeavePolicyService,
        leave_settings_service_1.LeaveSettingsService,
        leave_balance_service_1.LeaveBalanceService,
        employees_service_1.EmployeesService,
        audit_service_1.AuditService,
        holidays_service_1.HolidaysService,
        blocked_days_service_1.BlockedDaysService,
        reserved_days_service_1.ReservedDaysService,
        cache_service_1.CacheService])
], LeaveRequestService);
//# sourceMappingURL=leave-request.service.js.map