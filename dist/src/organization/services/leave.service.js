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
exports.LeaveService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const leave_attendance_schema_1 = require("../../drizzle/schema/leave-attendance.schema");
const employee_schema_1 = require("../../drizzle/schema/employee.schema");
const attendance_service_1 = require("./attendance.service");
const pusher_service_1 = require("../../notification/services/pusher.service");
const users_schema_1 = require("../../drizzle/schema/users.schema");
const push_notification_service_1 = require("../../notification/services/push-notification.service");
let LeaveService = class LeaveService {
    constructor(db, attendance, pusher, pushNotification) {
        this.db = db;
        this.attendance = attendance;
        this.pusher = pusher;
        this.pushNotification = pushNotification;
    }
    async leaveManagement(company_id, countryCode) {
        const leaveSummary = await this.getLeaveSummary(company_id);
        const holidays = await this.attendance.getUpcomingPublicHolidays(countryCode);
        const leaveRequests = await this.getAllCompanyLeaveRequests(company_id);
        return {
            leaveSummary: leaveSummary ?? [],
            holidays: holidays ?? [],
            leaveRequests: leaveRequests ?? [],
        };
    }
    async createLeave(company_id, dto) {
        const { leave_type, leave_entitlement } = dto;
        const existingLeave = await this.db
            .select()
            .from(leave_attendance_schema_1.leaves)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_attendance_schema_1.leaves.leave_type, leave_type), (0, drizzle_orm_1.eq)(leave_attendance_schema_1.leaves.company_id, company_id)))
            .execute();
        if (existingLeave.length > 0) {
            throw new common_1.BadRequestException(`${leave_type} Leave already exists for your company.`);
        }
        try {
            await this.db
                .insert(leave_attendance_schema_1.leaves)
                .values({
                leave_type,
                leave_entitlement,
                company_id,
            })
                .execute();
            return 'Leave created successfully';
        }
        catch (error) {
            throw new common_1.BadRequestException('Error creating leave. Please check your input and try again.' + error);
        }
    }
    async getLeaves(company_id) {
        try {
            const leave = await this.db
                .select()
                .from(leave_attendance_schema_1.leaves)
                .where((0, drizzle_orm_1.eq)(leave_attendance_schema_1.leaves.company_id, company_id))
                .execute();
            return leave;
        }
        catch (error) {
            throw new common_1.BadRequestException('Error fetching leave. Please check your input and try again.' + error);
        }
    }
    async getLeaveSummary(company_id) {
        try {
            const totalEmployees = await this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(employee_schema_1.employees)
                .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.company_id, company_id))
                .then((res) => res[0].count);
            const leaveTypes = await this.db
                .select({
                id: leave_attendance_schema_1.leaves.id,
                leave_type: leave_attendance_schema_1.leaves.leave_type,
                entitlement: leave_attendance_schema_1.leaves.leave_entitlement,
            })
                .from(leave_attendance_schema_1.leaves)
                .where((0, drizzle_orm_1.eq)(leave_attendance_schema_1.leaves.company_id, company_id));
            const usedLeaves = await this.db
                .select({
                leave_type: leave_attendance_schema_1.leave_balance.leave_type,
                used: (0, drizzle_orm_1.sql) `SUM(${leave_attendance_schema_1.leave_balance.used_leave_days})`.as('used'),
            })
                .from(leave_attendance_schema_1.leave_balance)
                .innerJoin(employee_schema_1.employees, (0, drizzle_orm_1.eq)(leave_attendance_schema_1.leave_balance.employee_id, employee_schema_1.employees.id))
                .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.company_id, company_id))
                .groupBy(leave_attendance_schema_1.leave_balance.id);
            const summary = leaveTypes.map((leave) => {
                const used = usedLeaves.find((usedLeave) => usedLeave.leave_type === leave.leave_type)?.used ?? 0;
                return {
                    leave_type: leave.leave_type,
                    leave_entitlement: leave.entitlement * totalEmployees,
                    used,
                };
            });
            return summary;
        }
        catch (error) {
            throw new common_1.BadRequestException('Error fetching leave summary: ' + error);
        }
    }
    async getLeaveById(id) {
        try {
            const leave = await this.db
                .select()
                .from(leave_attendance_schema_1.leaves)
                .where((0, drizzle_orm_1.eq)(leave_attendance_schema_1.leaves.id, id))
                .execute();
            return leave;
        }
        catch (error) {
            throw new common_1.BadRequestException('Error fetching leave. Please check your input and try again.' + error);
        }
    }
    async updateLeave(id, dto) {
        const { leave_type, leave_entitlement } = dto;
        try {
            await this.db
                .update(leave_attendance_schema_1.leaves)
                .set({
                leave_type,
                leave_entitlement,
            })
                .where((0, drizzle_orm_1.eq)(leave_attendance_schema_1.leaves.id, id))
                .execute();
            return 'Leave updated successfully';
        }
        catch (error) {
            throw new common_1.BadRequestException('Error updating leave. Please check your input and try again.' + error);
        }
    }
    async deleteLeave(id) {
        try {
            await this.db.delete(leave_attendance_schema_1.leaves).where((0, drizzle_orm_1.eq)(leave_attendance_schema_1.leaves.id, id)).execute();
            return 'Leave deleted successfully';
        }
        catch (error) {
            throw new common_1.BadRequestException('Error deleting leave. Please check your input and try again.' + error);
        }
    }
    async createLeaveRequest(employee_id, dto) {
        const { leave_type, start_date, end_date, total_days_off, notes } = dto;
        const existingRequest = await this.db
            .select()
            .from(leave_attendance_schema_1.leave_requests)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_attendance_schema_1.leave_requests.employee_id, employee_id), (0, drizzle_orm_1.eq)(leave_attendance_schema_1.leave_requests.leave_type, leave_type), (0, drizzle_orm_1.or)((0, drizzle_orm_1.and)((0, drizzle_orm_1.lte)(leave_attendance_schema_1.leave_requests.start_date, end_date), (0, drizzle_orm_1.gte)(leave_attendance_schema_1.leave_requests.end_date, start_date)), (0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(leave_attendance_schema_1.leave_requests.start_date, start_date), (0, drizzle_orm_1.lte)(leave_attendance_schema_1.leave_requests.end_date, end_date)))))
            .execute();
        if (existingRequest.length > 0) {
            throw new common_1.BadRequestException(`You already have an active leave request for the same leave type during the specified period.`);
        }
        const [balance] = await this.db
            .select({
            remaining_days: leave_attendance_schema_1.leave_balance.remaining_leave_days,
        })
            .from(leave_attendance_schema_1.leave_balance)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_attendance_schema_1.leave_balance.employee_id, employee_id), (0, drizzle_orm_1.eq)(leave_attendance_schema_1.leave_balance.leave_type, leave_type)))
            .execute();
        if (balance) {
            if (balance.remaining_days === null ||
                balance.remaining_days < total_days_off) {
                throw new common_1.BadRequestException(`You only have ${balance.remaining_days} day(s) left for ${leave_type}, but requested ${total_days_off}.`);
            }
        }
        const [employee] = await this.db
            .select({
            company_id: employee_schema_1.employees.company_id,
            employee_name: employee_schema_1.employees.first_name,
            employee_last_name: employee_schema_1.employees.last_name,
        })
            .from(employee_schema_1.employees)
            .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.id, employee_id))
            .execute();
        if (!employee) {
            throw new common_1.BadRequestException(`Employee not found.`);
        }
        const [entitlement] = await this.db
            .select({
            allowed_days: leave_attendance_schema_1.leaves.leave_entitlement,
        })
            .from(leave_attendance_schema_1.leaves)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_attendance_schema_1.leaves.company_id, employee.company_id), (0, drizzle_orm_1.eq)(leave_attendance_schema_1.leaves.leave_type, leave_type)))
            .execute();
        if (!entitlement) {
            throw new common_1.BadRequestException(`Leave entitlement not found for ${leave_type} in your company.`);
        }
        if (total_days_off > entitlement.allowed_days) {
            throw new common_1.BadRequestException(`Requested days (${total_days_off}) exceed your company's allowed entitlement of ${entitlement.allowed_days} day(s) for ${leave_type}.`);
        }
        try {
            await this.db
                .insert(leave_attendance_schema_1.leave_requests)
                .values({
                employee_id,
                leave_type,
                start_date,
                end_date,
                total_days_off,
                notes,
                leave_status: 'pending',
            })
                .execute();
            await this.pusher.createNotification(employee.company_id, `New Leave Request by ${employee.employee_name} ${employee.employee_last_name} for ${leave_type}`, 'leave');
            return 'Leave request created successfully';
        }
        catch (error) {
            throw new common_1.BadRequestException('Error creating leave request. Please check your input and try again. ' +
                error);
        }
    }
    async getAllCompanyLeaveRequests(company_id) {
        try {
            const leaveRequests = await this.db
                .select({
                id: leave_attendance_schema_1.leave_requests.id,
                leave_type: leave_attendance_schema_1.leave_requests.leave_type,
                start_date: leave_attendance_schema_1.leave_requests.start_date,
                end_date: leave_attendance_schema_1.leave_requests.end_date,
                leave_status: leave_attendance_schema_1.leave_requests.leave_status,
                total_days_off: leave_attendance_schema_1.leave_requests.total_days_off,
                employee_id: leave_attendance_schema_1.leave_requests.employee_id,
                employee_name: employee_schema_1.employees.first_name,
                employee_last_name: employee_schema_1.employees.last_name,
                approved_by: leave_attendance_schema_1.leave_requests.approved_by,
            })
                .from(leave_attendance_schema_1.leave_requests)
                .leftJoin(employee_schema_1.employees, (0, drizzle_orm_1.eq)(leave_attendance_schema_1.leave_requests.employee_id, employee_schema_1.employees.id))
                .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.company_id, company_id))
                .execute();
            return leaveRequests;
        }
        catch (error) {
            throw new common_1.BadRequestException('Error fetching leave requests. Please check your input and try again. ' +
                error);
        }
    }
    async getEmployeeRequests(employee_id) {
        try {
            const leaveRequests = await this.db
                .select()
                .from(leave_attendance_schema_1.leave_requests)
                .where((0, drizzle_orm_1.eq)(leave_attendance_schema_1.leave_requests.employee_id, employee_id))
                .execute();
            return leaveRequests;
        }
        catch (error) {
            throw new common_1.BadRequestException('Error fetching leave requests. Please check your input and try again.' +
                error);
        }
    }
    async getLeaveRequestById(id) {
        try {
            const leaveRequest = await this.db
                .select()
                .from(leave_attendance_schema_1.leave_requests)
                .where((0, drizzle_orm_1.eq)(leave_attendance_schema_1.leave_requests.id, id))
                .execute();
            return leaveRequest[0];
        }
        catch (error) {
            throw new common_1.BadRequestException('Error fetching leave request. Please check your input and try again.' +
                error);
        }
    }
    async updateLeaveRequest(id, dto) {
        const [existingRequest] = await this.db
            .select()
            .from(leave_attendance_schema_1.leave_requests)
            .where((0, drizzle_orm_1.eq)(leave_attendance_schema_1.leave_requests.id, id))
            .execute();
        if (!existingRequest) {
            throw new common_1.NotFoundException('Leave request not found');
        }
        try {
            await this.db
                .update(leave_attendance_schema_1.leave_requests)
                .set({
                leave_type: dto.leave_type,
                start_date: dto.start_date,
                end_date: dto.end_date,
                total_days_off: dto.total_days_off,
                notes: dto.notes,
            })
                .where((0, drizzle_orm_1.eq)(leave_attendance_schema_1.leave_requests.id, id))
                .execute();
            return 'Leave request updated successfully';
        }
        catch (error) {
            throw new common_1.BadRequestException('Error updating leave request. Please check your input and try again.' +
                error);
        }
    }
    async approveLeaveRequest(id, user_id) {
        try {
            const [request] = await this.db
                .select()
                .from(leave_attendance_schema_1.leave_requests)
                .where((0, drizzle_orm_1.eq)(leave_attendance_schema_1.leave_requests.id, id))
                .execute();
            if (!request) {
                throw new common_1.NotFoundException('Leave request not found');
            }
            const { employee_id, leave_type, total_days_off } = request;
            const [employee] = await this.db
                .select({ company_id: employee_schema_1.employees.company_id })
                .from(employee_schema_1.employees)
                .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.id, employee_id))
                .execute();
            if (!employee) {
                throw new common_1.NotFoundException('Employee not found');
            }
            const { company_id } = employee;
            const [entitlement] = await this.db
                .select({ leave_entitlement: leave_attendance_schema_1.leaves.leave_entitlement })
                .from(leave_attendance_schema_1.leaves)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_attendance_schema_1.leaves.leave_type, leave_type), (0, drizzle_orm_1.eq)(leave_attendance_schema_1.leaves.company_id, company_id)))
                .execute();
            if (!entitlement) {
                throw new common_1.NotFoundException('Leave entitlement not defined for this type and company');
            }
            const totalEntitled = Number(entitlement.leave_entitlement);
            await this.db
                .update(leave_attendance_schema_1.leave_requests)
                .set({
                leave_status: 'approved',
                approved_by: user_id,
            })
                .where((0, drizzle_orm_1.eq)(leave_attendance_schema_1.leave_requests.id, id))
                .execute();
            const [balance] = await this.db
                .select()
                .from(leave_attendance_schema_1.leave_balance)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_attendance_schema_1.leave_balance.employee_id, employee_id), (0, drizzle_orm_1.eq)(leave_attendance_schema_1.leave_balance.leave_type, leave_type)))
                .execute();
            const used = Number(balance?.used_leave_days ?? 0);
            const daysOff = Number(total_days_off ?? 0);
            const updatedUsed = used + daysOff;
            const updatedRemaining = Math.max(totalEntitled - updatedUsed, 0);
            if (balance) {
                await this.db
                    .update(leave_attendance_schema_1.leave_balance)
                    .set({
                    used_leave_days: updatedUsed,
                    remaining_leave_days: updatedRemaining,
                    total_leave_days: totalEntitled,
                })
                    .where((0, drizzle_orm_1.eq)(leave_attendance_schema_1.leave_balance.id, balance.id))
                    .execute();
            }
            else {
                await this.db
                    .insert(leave_attendance_schema_1.leave_balance)
                    .values({
                    employee_id,
                    leave_type,
                    total_leave_days: totalEntitled,
                    used_leave_days: updatedUsed,
                    remaining_leave_days: updatedRemaining,
                })
                    .execute();
            }
            await this.pusher.createNotification(company_id, `Leave request for ${leave_type} has been approved.`, 'leave');
            await this.pushNotification.sendPushNotification(employee_id, `Your leave request for ${leave_type} has been approved.`, 'leave', { leaveId: id });
            return 'Leave request approved and leave balance updated successfully';
        }
        catch (error) {
            throw new common_1.BadRequestException('Error approving leave request. ' + error);
        }
    }
    async rejectLeaveRequest(id, user_id) {
        try {
            const leaveRequest = await this.db
                .update(leave_attendance_schema_1.leave_requests)
                .set({
                leave_status: 'rejected',
                approved_by: user_id,
            })
                .where((0, drizzle_orm_1.eq)(leave_attendance_schema_1.leave_requests.id, id))
                .returning({
                leave_type: leave_attendance_schema_1.leave_requests.leave_type,
                employee_id: leave_attendance_schema_1.leave_requests.employee_id,
            })
                .execute();
            const [user] = await this.db
                .select({
                company_id: users_schema_1.users.company_id,
            })
                .from(users_schema_1.users)
                .where((0, drizzle_orm_1.eq)(users_schema_1.users.id, user_id))
                .execute();
            if (!user) {
                throw new common_1.NotFoundException('User not found');
            }
            await this.pusher.createNotification(user.company_id ?? '', `Leave request rejected.`, 'leave');
            await this.pushNotification.sendPushNotification(leaveRequest[0].employee_id, `Your leave request for ${leaveRequest[0].employee_id} has been approved.`, 'leave', { leaveId: id });
            return 'Leave request rejected successfully';
        }
        catch (error) {
            throw new common_1.BadRequestException('Error rejecting leave request. Please check your input and try again.' +
                error);
        }
    }
    async getLeaveBalance(employee_id) {
        try {
            const leaveBalance = await this.db
                .select()
                .from(leave_attendance_schema_1.leave_balance)
                .where((0, drizzle_orm_1.eq)(leave_attendance_schema_1.leave_balance.employee_id, employee_id))
                .execute();
            const leaveEntitlements = await this.db
                .select()
                .from(leave_attendance_schema_1.leaves)
                .execute();
            const leaveSummary = leaveEntitlements.map((leave) => {
                const matchedLeaveBalance = leaveBalance.find((balance) => balance.leave_type === leave.leave_type);
                const used = matchedLeaveBalance?.used_leave_days || 0;
                const remaining = matchedLeaveBalance?.remaining_leave_days || 0;
                return {
                    leave_type: leave.leave_type,
                    leave_entitlement: leave.leave_entitlement,
                    used,
                    remaining,
                    total: leave.leave_entitlement,
                };
            });
            return leaveSummary;
        }
        catch (error) {
            throw new common_1.BadRequestException('Error fetching leave balance. Please check your input and try again.' +
                error);
        }
    }
};
exports.LeaveService = LeaveService;
exports.LeaveService = LeaveService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, attendance_service_1.AttendanceService,
        pusher_service_1.PusherService,
        push_notification_service_1.PushNotificationService])
], LeaveService);
//# sourceMappingURL=leave.service.js.map