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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateReportsService = void 0;
const common_1 = require("@nestjs/common");
const report_service_1 = require("./report.service");
const export_util_1 = require("../../../utils/export.util");
const s3_storage_service_1 = require("../../../common/aws/s3-storage.service");
let GenerateReportsService = class GenerateReportsService {
    constructor(reportService, awsService) {
        this.reportService = reportService;
        this.awsService = awsService;
    }
    async generateDailyAttendanceSummaryToS3(companyId) {
        const summary = await this.reportService.getDailyAttendanceSummary(companyId);
        if (!summary.summaryList.length) {
            throw new Error('No attendance data available for today.');
        }
        const exportData = summary.summaryList.map((entry) => ({
            employeeId: entry.employeeNumber,
            name: entry.name,
            department: entry.department,
            checkInTime: entry.checkInTime,
            checkOutTime: entry.checkOutTime,
            status: entry.status,
        }));
        const today = summary.details.date;
        const filename = `daily_attendance_summary_${companyId}_${today.replace(/-/g, '')}`;
        const filePath = await export_util_1.ExportUtil.exportToCSV(exportData, [
            { field: 'employeeId', title: 'Employee ID' },
            { field: 'name', title: 'Name' },
            { field: 'department', title: 'Department' },
            { field: 'checkInTime', title: 'Check-In Time' },
            { field: 'checkOutTime', title: 'Check-Out Time' },
            { field: 'status', title: 'Attendance Status' },
        ], filename);
        const s3Url = await this.awsService.uploadFilePath(filePath, companyId, 'report', 'daily-attendance-summary');
        return s3Url;
    }
    async generateMonthlyAttendanceSummaryToS3(companyId, yearMonth) {
        const monthlySummary = await this.reportService.getMonthlyAttendanceSummary(companyId, yearMonth);
        if (!monthlySummary.length) {
            throw new Error('No data available to export for this month.');
        }
        const exportData = monthlySummary.map((entry) => ({
            employeeId: entry.employeeId,
            name: entry.name,
            presentDays: entry.present,
            lateDays: entry.late,
            absentDays: entry.absent,
            onLeaveDays: entry.onLeave,
            holidays: entry.holidays,
            penalties: entry.penalties,
        }));
        const filename = `monthly_attendance_summary_${companyId}_${yearMonth.replace('-', '')}`;
        const filePath = await export_util_1.ExportUtil.exportToCSV(exportData, [
            { field: 'employeeId', title: 'Employee ID' },
            { field: 'name', title: 'Employee Name' },
            { field: 'presentDays', title: 'Present Days' },
            { field: 'lateDays', title: 'Late Days' },
            { field: 'absentDays', title: 'Absent Days' },
            { field: 'onLeaveDays', title: 'Days on Leave' },
            { field: 'holidays', title: 'Holidays' },
            { field: 'penalties', title: 'Penalties' },
        ], filename);
        const s3Url = await this.awsService.uploadFilePath(filePath, companyId, 'report', 'attendance-summary');
        return s3Url;
    }
    async generateLateArrivalsReportToS3(companyId, yearMonth) {
        const lateData = await this.reportService.getLateArrivalsReport(companyId, yearMonth);
        const exportData = lateData.map((item) => ({
            employeeId: item.employeeId,
            date: item.clockIn.toISOString().split('T')[0],
        }));
        const filename = `late_arrivals_${companyId}_${yearMonth.replace('-', '')}`;
        const filePath = await export_util_1.ExportUtil.exportToCSV(exportData, [
            { field: 'employeeId', title: 'Employee ID' },
            { field: 'date', title: 'Date' },
        ], filename);
        const url = await this.awsService.uploadFilePath(filePath, companyId, 'report', 'attendance');
        return url;
    }
    async generateOvertimeReportToS3(companyId, yearMonth) {
        const overtimeData = await this.reportService.getOvertimeReport(companyId, yearMonth);
        const exportData = overtimeData.map((item) => ({
            employeeId: item.employeeId,
            date: item.clockIn.toISOString().split('T')[0],
            overtimeMinutes: item.overtimeMinutes,
        }));
        const filename = `overtime_report_${companyId}_${yearMonth.replace('-', '')}`;
        const filePath = await export_util_1.ExportUtil.exportToCSV(exportData, [
            { field: 'employeeId', title: 'Employee ID' },
            { field: 'date', title: 'Date' },
            { field: 'overtimeMinutes', title: 'Overtime (Minutes)' },
        ], filename);
        const url = await this.awsService.uploadFilePath(filePath, companyId, 'report', 'attendance');
        return url;
    }
    async generateAbsenteeismReportToS3(companyId, startDate, endDate) {
        const absenteeismData = await this.reportService.getAbsenteeismReport(companyId, startDate, endDate);
        const exportData = absenteeismData.map((item) => ({
            employeeId: item.employeeId,
            name: item.name,
            date: item.date,
        }));
        const filename = `absenteeism_report_${companyId}_${startDate}_${endDate}`.replace(/-/g, '');
        const filePath = await export_util_1.ExportUtil.exportToCSV(exportData, [
            { field: 'employeeId', title: 'Employee ID' },
            { field: 'name', title: 'Employee Name' },
            { field: 'date', title: 'Date' },
        ], filename);
        const url = await this.awsService.uploadFilePath(filePath, companyId, 'report', 'attendance');
        return url;
    }
    async generateDepartmentAttendanceReport(companyId, yearMonth) {
        const data = await this.reportService.getDepartmentAttendanceSummary(companyId, yearMonth);
        const exportData = Object.entries(data).map(([department, stats]) => ({
            department,
            present: stats.present,
            absent: stats.absent,
            total: stats.total,
            attendanceRate: ((stats.present / stats.total) * 100).toFixed(2) + '%',
        }));
        const filename = `department_attendance_${companyId}_${yearMonth}`;
        const filePath = export_util_1.ExportUtil.exportToCSV(exportData, [
            { field: 'department', title: 'Department' },
            { field: 'present', title: 'Present' },
            { field: 'absent', title: 'Absent' },
            { field: 'total', title: 'Total Employees' },
            { field: 'attendanceRate', title: 'Attendance Rate (%)' },
        ], filename);
        const url = await this.awsService.uploadFilePath(filePath, companyId, `attendance_report`, 'report');
        return url;
    }
};
exports.GenerateReportsService = GenerateReportsService;
exports.GenerateReportsService = GenerateReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [report_service_1.ReportService,
        s3_storage_service_1.S3StorageService])
], GenerateReportsService);
//# sourceMappingURL=generate-reports.service.js.map