import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { and, eq, SQL, sql } from 'drizzle-orm';
import { leaveBalances } from '../schema/leave-balance.schema';
import { leaveRequests } from '../schema/leave-requests.schema';
import { departments, employees } from 'src/drizzle/schema';
import { leaveTypes } from '../schema/leave-types.schema';
import { SearchLeaveReportsDto } from './dto/search-leave-report.dto';
import { HolidaysService } from '../holidays/holidays.service';
import { LeaveRequestService } from '../request/leave-request.service';
import { LeaveBalanceService } from '../balance/leave-balance.service';
import { ExportUtil } from 'src/utils/export.util';
import { S3StorageService } from 'src/common/aws/s3-storage.service';

interface LeaveBalanceReportFilter {
  leaveTypeName?: string;
  year?: number;
}

@Injectable()
export class LeaveReportService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly holidaysService: HolidaysService,
    private readonly leaveRequestService: LeaveRequestService,
    private readonly leaveBalanceService: LeaveBalanceService,
    private readonly awsService: S3StorageService,
  ) {}

  async leaveManagement(company_id: string, countryCode: string) {
    const holidays = await this.holidaysService.getUpcomingPublicHolidays(
      countryCode,
      company_id,
    );
    const leaveRequests = await this.leaveRequestService.findAll(company_id);
    const leaveBalances = await this.leaveBalanceService.findAll(company_id);

    return {
      holidays: holidays ?? [],
      leaveRequests: leaveRequests ?? [],
      leaveBalances: leaveBalances ?? [],
    };
  }

  // 1. List all employee leave balances
  async listEmployeeLeaveBalances(companyId: string) {
    return this.db
      .select({
        employeeId: leaveBalances.employeeId,
        leaveTypeId: leaveBalances.leaveTypeId,
        leaveTypeName: leaveTypes.name,
        entitlement: leaveBalances.entitlement,
        used: leaveBalances.used,
        balance: leaveBalances.balance,
        year: leaveBalances.year,
        employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
      })
      .from(leaveBalances)
      .innerJoin(leaveTypes, eq(leaveBalances.leaveTypeId, leaveTypes.id))
      .innerJoin(employees, eq(leaveBalances.employeeId, employees.id))
      .where(eq(leaveBalances.companyId, companyId))
      .execute();
  }

  // 2. List leave requests (optionally filtered)
  async listLeaveRequests(
    companyId: string,
    status?: 'pending' | 'approved' | 'rejected',
  ) {
    const conditions = [eq(leaveRequests.companyId, companyId)];
    if (status) {
      conditions.push(eq(leaveRequests.status, status));
    }

    return this.db
      .select({
        requestId: leaveRequests.id,
        employeeId: leaveRequests.employeeId,
        leaveTypeId: leaveRequests.leaveTypeId,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        totalDays: leaveRequests.totalDays,
        status: leaveRequests.status,
        requestedAt: leaveRequests.requestedAt,
        rejectionReason: leaveRequests.rejectionReason,
        employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
      })
      .from(leaveRequests)
      .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .where(and(...conditions))
      .orderBy(leaveRequests.startDate)
      .execute();
  }

  // 3. Departmental leave usage summary
  async departmentLeaveSummary(companyId: string) {
    return this.db
      .select({
        departmentName: departments.name,
        totalLeaveDays: sql<number>`SUM(${leaveRequests.totalDays})`,
      })
      .from(leaveRequests)
      .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .innerJoin(departments, eq(employees.departmentId, departments.id))
      .where(eq(leaveRequests.companyId, companyId))
      .groupBy(departments.name)
      .execute();
  }

  // 4. Pending approval requests
  async pendingApprovalRequests(companyId: string) {
    return this.db
      .select()
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.companyId, companyId),
          eq(leaveRequests.status, 'pending'),
        ),
      )
      .orderBy(leaveRequests.requestedAt)
      .execute();
  }

  async searchLeaveReports(companyId: string, dto: SearchLeaveReportsDto) {
    const { year } = dto;

    const maybeClauses = [
      eq(leaveRequests.companyId, companyId),
      year && sql`EXTRACT(YEAR FROM ${leaveRequests.startDate}) = ${year}`,
    ];

    const clauses = maybeClauses.filter((c): c is SQL => Boolean(c));

    const selectFields = {
      leaveType: leaveTypes.name,
      totalLeaveDays: sql<number>`SUM(${leaveRequests.totalDays})`,
    };

    const query = this.db
      .select(selectFields)
      .from(leaveRequests)
      .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .where(clauses.length ? and(...clauses) : undefined)
      .groupBy(leaveTypes.name);

    return query.execute();
  }

  async generateLeaveBalanceReport(companyId: string) {
    const balances = await this.listEmployeeLeaveBalances(companyId);

    return {
      leaveBalances: balances,
    };
  }

  async generateLeaveUtilizationReport(
    companyId: string,
    dto: SearchLeaveReportsDto,
  ) {
    const utilization = await this.searchLeaveReports(companyId, dto);
    const departmentUsage = await this.departmentLeaveSummary(companyId);

    return {
      leaveUtilization: utilization,
      departmentUsage,
    };
  }

  async generateLeaveBalanceReportToS3(
    companyId: string,
    filters: LeaveBalanceReportFilter = {},
  ) {
    const whereConditions = [eq(leaveBalances.companyId, companyId)];

    if (filters.leaveTypeName) {
      whereConditions.push(eq(leaveTypes.name, filters.leaveTypeName));
    }

    if (filters.year) {
      whereConditions.push(eq(leaveBalances.year, filters.year));
    }

    const balances = await this.db
      .select({
        employeeId: leaveBalances.employeeId,
        leaveTypeId: leaveBalances.leaveTypeId,
        leaveTypeName: leaveTypes.name,
        entitlement: leaveBalances.entitlement,
        used: leaveBalances.used,
        balance: leaveBalances.balance,
        year: leaveBalances.year,
        employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
      })
      .from(leaveBalances)
      .innerJoin(leaveTypes, eq(leaveBalances.leaveTypeId, leaveTypes.id))
      .innerJoin(employees, eq(leaveBalances.employeeId, employees.id))
      .where(and(...whereConditions))
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

    const filePath = await ExportUtil.exportToCSV(
      exportData,
      [
        { field: 'employeeName', title: 'Employee Name' },
        { field: 'leaveType', title: 'Leave Type' },
        { field: 'entitlement', title: 'Entitlement' },
        { field: 'used', title: 'Used' },
        { field: 'balance', title: 'Balance' },
        { field: 'year', title: 'Year' },
      ],
      filename,
    );

    const s3Url = await this.awsService.uploadFilePath(
      filePath,
      companyId,
      'report',
      'leave-balance',
    );

    return s3Url;
  }
}
