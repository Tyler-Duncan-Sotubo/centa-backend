import { Injectable } from '@nestjs/common';
import { ReportService } from './report.service';
import { ExportUtil } from 'src/utils/export.util';
import { S3StorageService } from 'src/common/aws/s3-storage.service';

@Injectable()
export class GenerateReportsService {
  constructor(
    private readonly reportService: ReportService,
    private readonly awsService: S3StorageService, // Assuming you have an AWS service for S3 uploads
  ) {}

  async generateDailyAttendanceSummaryToS3(companyId: string) {
    // 1. Get today's attendance summary
    const summary =
      await this.reportService.getDailyAttendanceSummary(companyId);

    if (!summary.summaryList.length) {
      throw new Error('No attendance data available for today.');
    }

    // 2. Prepare export data
    const exportData = summary.summaryList.map((entry) => ({
      employeeId: entry.employeeNumber,
      name: entry.name,
      department: entry.department,
      checkInTime: entry.checkInTime,
      checkOutTime: entry.checkOutTime,
      status: entry.status,
    }));

    const today = summary.details.date; // already in 'YYYY-MM-DD' format
    const filename = `daily_attendance_summary_${companyId}_${today.replace(/-/g, '')}`;

    // 3. Export locally using ExportUtil
    const filePath = await ExportUtil.exportToCSV(
      exportData,
      [
        { field: 'employeeId', title: 'Employee ID' },
        { field: 'name', title: 'Name' },
        { field: 'department', title: 'Department' },
        { field: 'checkInTime', title: 'Check-In Time' },
        { field: 'checkOutTime', title: 'Check-Out Time' },
        { field: 'status', title: 'Attendance Status' },
      ],
      filename,
    );

    // 4. Upload to S3
    const s3Url = await this.awsService.uploadFilePath(
      filePath,
      companyId,
      'report',
      'daily-attendance-summary',
    );

    return s3Url;
  }

  async generateMonthlyAttendanceSummaryToS3(
    companyId: string,
    yearMonth: string,
  ) {
    // 1. Get attendance summary
    const monthlySummary = await this.reportService.getMonthlyAttendanceSummary(
      companyId,
      yearMonth,
    );

    if (!monthlySummary.length) {
      throw new Error('No data available to export for this month.');
    }

    // 2. Prepare data for CSV export
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

    // 3. Export locally first (with ExportUtil)
    const filePath = await ExportUtil.exportToCSV(
      exportData,
      [
        { field: 'employeeId', title: 'Employee ID' },
        { field: 'name', title: 'Employee Name' },
        { field: 'presentDays', title: 'Present Days' },
        { field: 'lateDays', title: 'Late Days' },
        { field: 'absentDays', title: 'Absent Days' },
        { field: 'onLeaveDays', title: 'Days on Leave' },
        { field: 'holidays', title: 'Holidays' },
        { field: 'penalties', title: 'Penalties' },
      ],
      filename,
    );

    // 4. Upload to S3
    const s3Url = await this.awsService.uploadFilePath(
      filePath,
      companyId,
      'report',
      'attendance-summary',
    );

    return s3Url;
  }

  async generateLateArrivalsReportToS3(companyId: string, yearMonth: string) {
    // 1. Get late arrival records
    const lateData = await this.reportService.getLateArrivalsReport(
      companyId,
      yearMonth,
    );

    // 2. Prepare data for export
    const exportData = lateData.map((item) => ({
      employeeId: item.employeeId,
      date: item.clockIn.toISOString().split('T')[0],
    }));

    const filename = `late_arrivals_${companyId}_${yearMonth.replace('-', '')}`;

    // 3. Export to CSV
    const filePath = await ExportUtil.exportToCSV(
      exportData,
      [
        { field: 'employeeId', title: 'Employee ID' },
        { field: 'date', title: 'Date' },
      ],
      filename,
    );

    // 4. Upload to S3
    const url = await this.awsService.uploadFilePath(
      filePath,
      companyId,
      'report',
      'attendance',
    );

    return url; // S3 public link
  }

  async generateOvertimeReportToS3(companyId: string, yearMonth: string) {
    // 1. Get overtime records
    const overtimeData = await this.reportService.getOvertimeReport(
      companyId,
      yearMonth,
    );

    // 2. Prepare data for export
    const exportData = overtimeData.map((item) => ({
      employeeId: item.employeeId,
      date: item.clockIn.toISOString().split('T')[0],
      overtimeMinutes: item.overtimeMinutes,
    }));

    const filename = `overtime_report_${companyId}_${yearMonth.replace('-', '')}`;

    // 3. Export to CSV
    const filePath = await ExportUtil.exportToCSV(
      exportData,
      [
        { field: 'employeeId', title: 'Employee ID' },
        { field: 'date', title: 'Date' },
        { field: 'overtimeMinutes', title: 'Overtime (Minutes)' },
      ],
      filename,
    );

    // 4. Upload to S3
    const url = await this.awsService.uploadFilePath(
      filePath,
      companyId,
      'report',
      'attendance',
    );

    return url; // S3 public link (or signed link)
  }

  async generateAbsenteeismReportToS3(
    companyId: string,
    startDate: string,
    endDate: string,
  ) {
    // 1. Get absenteeism data
    const absenteeismData = await this.reportService.getAbsenteeismReport(
      companyId,
      startDate,
      endDate,
    );

    // 2. Prepare data for export
    const exportData = absenteeismData.map((item) => ({
      employeeId: item.employeeId,
      name: item.name,
      date: item.date,
    }));

    const filename =
      `absenteeism_report_${companyId}_${startDate}_${endDate}`.replace(
        /-/g,
        '',
      );

    // 3. Export to CSV locally
    const filePath = await ExportUtil.exportToCSV(
      exportData,
      [
        { field: 'employeeId', title: 'Employee ID' },
        { field: 'name', title: 'Employee Name' },
        { field: 'date', title: 'Date' },
      ],
      filename,
    );

    // 4. Upload to S3
    const url = await this.awsService.uploadFilePath(
      filePath,
      companyId,
      'report',
      'attendance',
    );

    return url; // 🚀 Downloadable S3 URL
  }

  async generateDepartmentAttendanceReport(
    companyId: string,
    yearMonth: string,
  ) {
    const data = await this.reportService.getDepartmentAttendanceSummary(
      companyId,
      yearMonth,
    );

    const exportData = Object.entries(data).map(([department, stats]) => ({
      department,
      present: stats.present,
      absent: stats.absent,
      total: stats.total,
      attendanceRate: ((stats.present / stats.total) * 100).toFixed(2) + '%',
    }));

    const filename = `department_attendance_${companyId}_${yearMonth}`;

    // Step 1: Export locally
    const filePath = ExportUtil.exportToCSV(
      exportData,
      [
        { field: 'department', title: 'Department' },
        { field: 'present', title: 'Present' },
        { field: 'absent', title: 'Absent' },
        { field: 'total', title: 'Total Employees' },
        { field: 'attendanceRate', title: 'Attendance Rate (%)' },
      ],
      filename,
    );

    // Step 2: Upload to S3
    const url = await this.awsService.uploadFilePath(
      filePath,
      companyId,
      `attendance_report`,
      'report',
    );

    return url; // 🚀 Return the S3 URL to frontend
  }
}
