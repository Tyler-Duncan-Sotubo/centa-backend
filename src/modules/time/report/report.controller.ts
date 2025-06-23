import { Controller, Get, Query, SetMetadata, UseGuards } from '@nestjs/common';
import { ReportService } from './report.service';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { GenerateReportsService } from './generate-reports.service';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('attendance-report')
export class ReportController extends BaseController {
  constructor(
    private readonly reportService: ReportService,
    private readonly generateReportsService: GenerateReportsService, // Assuming you have a service to handle report generation
  ) {
    super();
  }

  @Get('attendance/combined')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['reports.attendance.read'])
  async getCombinedAttendanceReport(
    @CurrentUser() user: User,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('yearMonth') yearMonth: string,
  ) {
    return this.reportService.getCombinedAttendanceReports(
      user.companyId,
      yearMonth,
      startDate,
      endDate,
    );
  }

  @Get('attendance-summary')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['reports.attendance.read'])
  async getAttendanceSummary(@CurrentUser() user: User) {
    return this.reportService.getDailyAttendanceSummary(user.companyId);
  }

  @Get('monthly-attendance-summary')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['reports.attendance.read'])
  async getMonthlyAttendanceSummary(
    @CurrentUser() user: User,
    @Query('yearMonth') yearMonth: string, // "2025-04"
  ) {
    return this.reportService.getMonthlyAttendanceSummary(
      user.companyId,
      yearMonth,
    );
  }

  @Get('shift-summary')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['reports.attendance.read'])
  async getShiftDashboardSummaryByMonth(
    @CurrentUser() user: User,
    @Query('yearMonth') yearMonth: string, // e.g. "2025-06"
    @Query('locationId') locationId?: string, // optional filter
    @Query('departmentId') departmentId?: string, // optional filter
  ) {
    return this.reportService.getShiftDashboardSummaryByMonth(
      user.companyId,
      yearMonth,
      { locationId, departmentId }, // pass filters object
    );
  }

  @Get('late-arrivals')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['reports.attendance.read'])
  async getLateArrivalsReport(
    @CurrentUser() user: User,
    @Query('yearMonth') yearMonth: string,
  ) {
    return this.reportService.getLateArrivalsReport(user.companyId, yearMonth);
  }

  @Get('absenteeism')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['reports.attendance.read'])
  async getAbsenteeismReport(
    @CurrentUser() user: User,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportService.getAbsenteeismReport(
      user.companyId,
      startDate,
      endDate,
    );
  }

  @Get('overtime')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['reports.attendance.read'])
  async getOvertimeReport(
    @CurrentUser() user: User,
    @Query('yearMonth') yearMonth: string,
  ) {
    return this.reportService.getOvertimeReport(user.companyId, yearMonth);
  }

  @Get('department-report')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['reports.attendance.read'])
  async getDepartmentReport(
    @CurrentUser() user: User,
    @Query('yearMonth') yearMonth: string,
  ) {
    return this.reportService.getDepartmentAttendanceSummary(
      user.companyId,
      yearMonth,
    );
  }

  // GENERATE REPORTS

  @Get('gen-daily-attendance-summary')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['reports.attendance.download'])
  async downloadDailyAttendanceSummary(@CurrentUser() user: User) {
    const url =
      await this.generateReportsService.generateDailyAttendanceSummaryToS3(
        user.companyId,
      );
    return { url };
  }

  @Get('gen-monthly-attendance-summary')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['reports.attendance.download'])
  async downloadMonthlyAttendanceSummary(
    @CurrentUser() user: User,
    @Query('yearMonth') yearMonth: string, // "2025-04"
  ) {
    const url =
      await this.generateReportsService.generateMonthlyAttendanceSummaryToS3(
        user.companyId,
        yearMonth,
      );
    return { url };
  }

  @Get('gen-late-arrivals')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['reports.attendance.download'])
  async downloadLateArrivalsReport(
    @CurrentUser() user: User,
    @Query('yearMonth') yearMonth: string,
  ) {
    const url =
      await this.generateReportsService.generateLateArrivalsReportToS3(
        user.companyId,
        yearMonth,
      );
    return { url };
  }

  @Get('gen-department-report')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['reports.attendance.download'])
  async generateDepartmentReport(
    @CurrentUser() user: User,
    @Query('yearMonth') yearMonth: string,
  ) {
    const url =
      await this.generateReportsService.generateDepartmentAttendanceReport(
        user.companyId,
        yearMonth,
      );
    return { url };
  }

  @Get('gen-absenteeism')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['reports.attendance.download'])
  async downloadAbsenteeismReport(
    @CurrentUser() user: User,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const url = await this.generateReportsService.generateAbsenteeismReportToS3(
      user.companyId,
      startDate,
      endDate,
    );
    return { url };
  }

  @Get('gen-overtime')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['reports.attendance.download'])
  async downloadOvertimeReport(
    @CurrentUser() user: User,
    @Query('yearMonth') yearMonth: string,
  ) {
    const url = await this.generateReportsService.generateOvertimeReportToS3(
      user.companyId,
      yearMonth,
    );
    return { url };
  }
}
