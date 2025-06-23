import {
  Controller,
  Get,
  UseGuards,
  SetMetadata,
  Ip,
  Query,
} from '@nestjs/common';
import { LeaveReportService } from './report.service';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';
import { SearchLeaveReportsDto } from './dto/search-leave-report.dto';

@Controller('leave-reports')
export class ReportController extends BaseController {
  constructor(private readonly reportService: LeaveReportService) {
    super();
  }

  @Get('leave-management')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.reports'])
  @SetMetadata('roles', ['admin', 'hr', 'super_admin'])
  async getLeaveManagement(@CurrentUser() user: User) {
    return this.reportService.leaveManagement(user.companyId, 'NG');
  }

  @Get('balances')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.reports'])
  async getLeaveBalances(@CurrentUser() user: User): Promise<any> {
    return this.reportService.listEmployeeLeaveBalances(user.companyId);
  }

  @Get('requests')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.reports'])
  async getLeaveRequests(
    @CurrentUser() user: User,
    @Ip() ip: string,
    @Query('status') status?: 'pending' | 'approved' | 'rejected',
  ): Promise<any> {
    return this.reportService.listLeaveRequests(user.companyId, status);
  }

  // Pending leave requests
  @Get('summary/pending')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.reports'])
  async getPendingLeaveRequests(@CurrentUser() user: User): Promise<any> {
    return this.reportService.pendingApprovalRequests(user.companyId);
  }

  @Get('balance-report')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.reports'])
  getLeaveBalanceReport(@CurrentUser() user: User) {
    return this.reportService.generateLeaveBalanceReport(user.companyId);
  }

  @Get('utilization-report')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.reports'])
  getLeaveUtilizationReport(
    @CurrentUser() user: User,
    @Query() dto: SearchLeaveReportsDto,
  ) {
    return this.reportService.generateLeaveUtilizationReport(
      user.companyId,
      dto,
    );
  }

  // /leave-reports/search?groupBy=leaveType
  // /leave-reports/search?groupBy=year
  //  /leave-reports/search?groupBy=month&year=2025

  @Get('gen-leave-balance-report')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['reports.attendance.download'])
  async generateLeaveBalanceReportToS3(
    @CurrentUser() user: User,
    @Query('leaveTypeName') leaveTypeName?: string,
    @Query('year') year?: number,
  ) {
    interface LeaveBalanceReportFilter {
      leaveTypeName?: string;
      year?: number;
    }

    const filters: LeaveBalanceReportFilter = {
      year: year ? parseInt(year.toString(), 10) : undefined,
      leaveTypeName: leaveTypeName || undefined,
    };

    const url = await this.reportService.generateLeaveBalanceReportToS3(
      user.companyId,
      filters,
    );
    return { url };
  }
}
