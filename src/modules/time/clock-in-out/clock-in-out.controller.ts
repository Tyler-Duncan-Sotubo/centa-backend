import {
  Controller,
  Get,
  Post,
  Body,
  SetMetadata,
  UseGuards,
  Query,
  Param,
  Ip,
} from '@nestjs/common';
import { ClockInOutService } from './clock-in-out.service';
import { CreateClockInOutDto } from './dto/create-clock-in-out.dto';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { AdjustAttendanceDto } from './dto/adjust-attendance.dto';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('clock-in-out')
export class ClockInOutController extends BaseController {
  constructor(private readonly clockInOutService: ClockInOutService) {
    super();
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['attendance.clockin'])
  @Post('clock-in')
  async clockIn(@Body() dto: CreateClockInOutDto, @CurrentUser() user: User) {
    return this.clockInOutService.clockIn(user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['attendance.clockout'])
  @Post('clock-out')
  async clockOut(@Body() dto: CreateClockInOutDto, @CurrentUser() user: User) {
    return this.clockInOutService.clockOut(user, dto.latitude, dto.longitude);
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['attendance.clockin'])
  @Get('status/:employeeId')
  async getAttendanceStatus(
    @CurrentUser() user: User,
    @Param('employeeId') employeeId: string, // Optional: if you want to check status for a specific employee
  ) {
    return this.clockInOutService.getAttendanceStatus(
      employeeId,
      user.companyId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['attendance.read'])
  @Get('attendance-summary')
  async getDailyDashboardStatsByDate(
    @CurrentUser() user: User,
    @Query('date') date: string, // "YYYY-MM-DD" // "2023-10-10"
  ) {
    return this.clockInOutService.getDailyDashboardStatsByDate(
      user.companyId,
      date,
    );
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['attendance.read'])
  @Get('daily-dashboard-stats')
  async getDailyDashboardStats(@CurrentUser() user: User) {
    return this.clockInOutService.getDailyDashboardStats(user.companyId);
  }

  @Get('attendance/monthly-stats')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['attendance.read'])
  async monthlyStats(
    @Query('yearMonth') yearMonth: string, // "YYYY-MM" // "2023-10"
    @CurrentUser() user: User,
  ) {
    return this.clockInOutService.getMonthlyDashboardStats(
      user.companyId,
      yearMonth,
    );
  }

  @Get('employee-attendance')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['attendance.read'])
  async getEmployeeAttendance(
    @Query('employeeId') employeeId: string,
    @Query('yearMonth') yearMonth: string, // "YYYY-MM"
    @CurrentUser() user: User,
  ) {
    return this.clockInOutService.getEmployeeAttendanceByDate(
      employeeId,
      user.companyId,
      yearMonth,
    );
  }

  @Get('employee-attendance-month')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['attendance.read'])
  async getEmployeeAttendanceByMonth(
    @Query('employeeId') employeeId: string,
    @Query('yearMonth') yearMonth: string, // "YYYY-MM"
    @CurrentUser() user: User,
  ) {
    return this.clockInOutService.getEmployeeAttendanceByMonth(
      employeeId,
      user.companyId,
      yearMonth,
    );
  }

  @Post('adjust-attendance/:attendanceRecordId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['attendance.manage'])
  async adjustAttendance(
    @Param('attendanceRecordId') attendanceRecordId: string,
    @Body() dto: AdjustAttendanceDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.clockInOutService.adjustAttendanceRecord(
      dto,
      attendanceRecordId,
      user,
      ip,
    );
  }
}
