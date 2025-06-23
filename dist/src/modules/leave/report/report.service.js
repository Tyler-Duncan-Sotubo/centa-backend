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
exports.LeaveReportService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const leave_balance_schema_1 = require("../schema/leave-balance.schema");
const leave_requests_schema_1 = require("../schema/leave-requests.schema");
const schema_1 = require("../../../drizzle/schema");
const leave_types_schema_1 = require("../schema/leave-types.schema");
const holidays_service_1 = require("../holidays/holidays.service");
const leave_request_service_1 = require("../request/leave-request.service");
const leave_balance_service_1 = require("../balance/leave-balance.service");
const export_util_1 = require("../../../utils/export.util");
const s3_storage_service_1 = require("../../../common/aws/s3-storage.service");
let LeaveReportService = class LeaveReportService {
    constructor(db, holidaysService, leaveRequestService, leaveBalanceService, awsService) {
        this.db = db;
        this.holidaysService = holidaysService;
        this.leaveRequestService = leaveRequestService;
        this.leaveBalanceService = leaveBalanceService;
        this.awsService = awsService;
    }
    async leaveManagement(company_id, countryCode) {
        const holidays = await this.holidaysService.getUpcomingPublicHolidays(countryCode, company_id);
        const leaveRequests = await this.leaveRequestService.findAll(company_id);
        const leaveBalances = await this.leaveBalanceService.findAll(company_id);
        return {
            holidays: holidays ?? [],
            leaveRequests: leaveRequests ?? [],
            leaveBalances: leaveBalances ?? [],
        };
    }
    async listEmployeeLeaveBalances(companyId) {
        return this.db
            .select({
            employeeId: leave_balance_schema_1.leaveBalances.employeeId,
            leaveTypeId: leave_balance_schema_1.leaveBalances.leaveTypeId,
            leaveTypeName: leave_types_schema_1.leaveTypes.name,
            entitlement: leave_balance_schema_1.leaveBalances.entitlement,
            used: leave_balance_schema_1.leaveBalances.used,
            balance: leave_balance_schema_1.leaveBalances.balance,
            year: leave_balance_schema_1.leaveBalances.year,
            employeeName: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
        })
            .from(leave_balance_schema_1.leaveBalances)
            .innerJoin(leave_types_schema_1.leaveTypes, (0, drizzle_orm_1.eq)(leave_balance_schema_1.leaveBalances.leaveTypeId, leave_types_schema_1.leaveTypes.id))
            .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(leave_balance_schema_1.leaveBalances.employeeId, schema_1.employees.id))
            .where((0, drizzle_orm_1.eq)(leave_balance_schema_1.leaveBalances.companyId, companyId))
            .execute();
    }
    async listLeaveRequests(companyId, status) {
        const conditions = [(0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.companyId, companyId)];
        if (status) {
            conditions.push((0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.status, status));
        }
        return this.db
            .select({
            requestId: leave_requests_schema_1.leaveRequests.id,
            employeeId: leave_requests_schema_1.leaveRequests.employeeId,
            leaveTypeId: leave_requests_schema_1.leaveRequests.leaveTypeId,
            startDate: leave_requests_schema_1.leaveRequests.startDate,
            endDate: leave_requests_schema_1.leaveRequests.endDate,
            totalDays: leave_requests_schema_1.leaveRequests.totalDays,
            status: leave_requests_schema_1.leaveRequests.status,
            requestedAt: leave_requests_schema_1.leaveRequests.requestedAt,
            rejectionReason: leave_requests_schema_1.leaveRequests.rejectionReason,
            employeeName: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
        })
            .from(leave_requests_schema_1.leaveRequests)
            .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.employeeId, schema_1.employees.id))
            .innerJoin(leave_types_schema_1.leaveTypes, (0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.leaveTypeId, leave_types_schema_1.leaveTypes.id))
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy(leave_requests_schema_1.leaveRequests.startDate)
            .execute();
    }
    async departmentLeaveSummary(companyId) {
        return this.db
            .select({
            departmentName: schema_1.departments.name,
            totalLeaveDays: (0, drizzle_orm_1.sql) `SUM(${leave_requests_schema_1.leaveRequests.totalDays})`,
        })
            .from(leave_requests_schema_1.leaveRequests)
            .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.employeeId, schema_1.employees.id))
            .innerJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.employees.departmentId, schema_1.departments.id))
            .where((0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.companyId, companyId))
            .groupBy(schema_1.departments.name)
            .execute();
    }
    async pendingApprovalRequests(companyId) {
        return this.db
            .select()
            .from(leave_requests_schema_1.leaveRequests)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.companyId, companyId), (0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.status, 'pending')))
            .orderBy(leave_requests_schema_1.leaveRequests.requestedAt)
            .execute();
    }
    async searchLeaveReports(companyId, dto) {
        const { year } = dto;
        const maybeClauses = [
            (0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.companyId, companyId),
            year && (0, drizzle_orm_1.sql) `EXTRACT(YEAR FROM ${leave_requests_schema_1.leaveRequests.startDate}) = ${year}`,
        ];
        const clauses = maybeClauses.filter((c) => Boolean(c));
        const selectFields = {
            leaveType: leave_types_schema_1.leaveTypes.name,
            totalLeaveDays: (0, drizzle_orm_1.sql) `SUM(${leave_requests_schema_1.leaveRequests.totalDays})`,
        };
        const query = this.db
            .select(selectFields)
            .from(leave_requests_schema_1.leaveRequests)
            .innerJoin(leave_types_schema_1.leaveTypes, (0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.leaveTypeId, leave_types_schema_1.leaveTypes.id))
            .where(clauses.length ? (0, drizzle_orm_1.and)(...clauses) : undefined)
            .groupBy(leave_types_schema_1.leaveTypes.name);
        return query.execute();
    }
    async generateLeaveBalanceReport(companyId) {
        const balances = await this.listEmployeeLeaveBalances(companyId);
        return {
            leaveBalances: balances,
        };
    }
    async generateLeaveUtilizationReport(companyId, dto) {
        const utilization = await this.searchLeaveReports(companyId, dto);
        const departmentUsage = await this.departmentLeaveSummary(companyId);
        return {
            leaveUtilization: utilization,
            departmentUsage,
        };
    }
    async generateLeaveBalanceReportToS3(companyId, filters = {}) {
        const whereConditions = [(0, drizzle_orm_1.eq)(leave_balance_schema_1.leaveBalances.companyId, companyId)];
        if (filters.leaveTypeName) {
            whereConditions.push((0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.name, filters.leaveTypeName));
        }
        if (filters.year) {
            whereConditions.push((0, drizzle_orm_1.eq)(leave_balance_schema_1.leaveBalances.year, filters.year));
        }
        const balances = await this.db
            .select({
            employeeId: leave_balance_schema_1.leaveBalances.employeeId,
            leaveTypeId: leave_balance_schema_1.leaveBalances.leaveTypeId,
            leaveTypeName: leave_types_schema_1.leaveTypes.name,
            entitlement: leave_balance_schema_1.leaveBalances.entitlement,
            used: leave_balance_schema_1.leaveBalances.used,
            balance: leave_balance_schema_1.leaveBalances.balance,
            year: leave_balance_schema_1.leaveBalances.year,
            employeeName: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
        })
            .from(leave_balance_schema_1.leaveBalances)
            .innerJoin(leave_types_schema_1.leaveTypes, (0, drizzle_orm_1.eq)(leave_balance_schema_1.leaveBalances.leaveTypeId, leave_types_schema_1.leaveTypes.id))
            .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(leave_balance_schema_1.leaveBalances.employeeId, schema_1.employees.id))
            .where((0, drizzle_orm_1.and)(...whereConditions))
            .execute();
        if (!balances.length) {
            throw new Error('No leave balance data available to export.');
        }
        const exportData = balances.map((entry) => ({
            employeeId: entry.employeeId,
            employeeName: entry.employeeName,
            leaveType: entry.leaveTypeName,
            entitlement: entry.entitlement,
            used: entry.used,
            balance: entry.balance,
            year: entry.year,
        }));
        const leaveTypePart = filters.leaveTypeName
            ? `_${filters.leaveTypeName}`
            : '';
        const yearPart = filters.year ? `_year${filters.year}` : '';
        const filename = `leave_balance_report_${companyId}${leaveTypePart}${yearPart}_${new Date().toISOString().split('T')[0]}`;
        const filePath = await export_util_1.ExportUtil.exportToCSV(exportData, [
            { field: 'employeeName', title: 'Employee Name' },
            { field: 'leaveType', title: 'Leave Type' },
            { field: 'entitlement', title: 'Entitlement' },
            { field: 'used', title: 'Used' },
            { field: 'balance', title: 'Balance' },
            { field: 'year', title: 'Year' },
        ], filename);
        const s3Url = await this.awsService.uploadFilePath(filePath, companyId, 'report', 'leave-balance');
        return s3Url;
    }
};
exports.LeaveReportService = LeaveReportService;
exports.LeaveReportService = LeaveReportService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, holidays_service_1.HolidaysService,
        leave_request_service_1.LeaveRequestService,
        leave_balance_service_1.LeaveBalanceService,
        s3_storage_service_1.S3StorageService])
], LeaveReportService);
//# sourceMappingURL=report.service.js.map