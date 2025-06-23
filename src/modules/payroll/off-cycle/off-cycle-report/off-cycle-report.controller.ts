import {
  Controller,
  Get,
  Param,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { OffCycleReportService } from './off-cycle-report.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('off-cycle-report')
export class OffCycleReportController extends BaseController {
  constructor(private readonly offCycleReportService: OffCycleReportService) {
    super();
  }

  @Get('')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async getOffCycleSummary(
    @CurrentUser() user: User,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    return this.offCycleReportService.getOffCycleSummary(
      user.companyId,
      fromDate,
      toDate,
    );
  }

  @Get('vs-regular')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async getOffCycleVsRegular(
    @CurrentUser() user: User,
    @Query('month') month: string,
  ) {
    return this.offCycleReportService.getOffCycleVsRegular(
      user.companyId,
      month,
    );
  }

  @Get('employee/:employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async getOffCycleByEmployee(
    @CurrentUser() user: User,
    @Param('employeeId') employeeId: string,
  ) {
    return this.offCycleReportService.getOffCycleByEmployee(
      user.companyId,
      employeeId,
    );
  }

  @Get('type-breakdown')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async getOffCycleTypeBreakdown(
    @CurrentUser() user: User,
    @Query('month') month: string,
  ) {
    return this.offCycleReportService.getOffCycleTypeBreakdown(
      user.companyId,
      month,
    );
  }

  @Get('employee/:employeeId/type-breakdown')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async getOffCycleTaxImpact(
    @CurrentUser() user: User,
    @Query('month') month: string,
  ) {
    return this.offCycleReportService.getOffCycleTaxImpact(
      user.companyId,
      month,
    );
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async getOffCycleDashboard(
    @CurrentUser() user: User,
    @Query('month') month?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.offCycleReportService.getOffCycleDashboard(user.companyId, {
      month,
      fromDate,
      toDate,
      employeeId,
    });
  }
}
