import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  SetMetadata,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { BaseController } from 'src/config/base.controller';
import { AuditInterceptor } from 'src/audit/audit.interceptor';
import { Audit } from 'src/audit/audit.decorator';
import { AttendanceService } from './services/attendance.service';
import {
  CreateEmployeeLocationDto,
  CreateOfficeLocationDto,
} from './dto/locations.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { User } from 'src/types/user.type';
import { CurrentUser } from 'src/auth/decorator/current-user.decorator';
import { LeaveService } from './services/leave.service';
import {
  CreateLeaveDto,
  CreateLeaveRequestDto,
  UpdateLeaveDto,
  UpdateLeaveRequestDto,
} from './dto/leave.dto';

@UseInterceptors(AuditInterceptor)
@Controller('')
export class LeaveAttendanceController extends BaseController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly leaveService: LeaveService,
  ) {
    super();
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  @Get('holidays')
  async getHolidays() {
    return this.attendanceService.insertHolidaysForCurrentYear('NG'); //
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  @Audit({ action: 'Created Office Location', entity: 'Attendance' })
  @Post('office-locations')
  async createOfficeLocation(
    @Body() dto: CreateOfficeLocationDto,
    @CurrentUser() user: User,
  ) {
    return this.attendanceService.createOfficeLocation(user.company_id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  @Get('office-locations')
  async getOfficeLocations(@CurrentUser() user: User) {
    return this.attendanceService.getOfficeLocations(user.company_id);
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  @Get('office-locations/:location_id')
  async getOfficeLocationById(@Param('location_id') location_id: string) {
    return this.attendanceService.getOfficeLocationById(location_id);
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  @Audit({ action: 'Updated Office Location', entity: 'Attendance' })
  @Put('office-locations/:location_id')
  async updateOfficeLocation(
    @Body() dto: CreateOfficeLocationDto,
    @Param('location_id') location_id: string,
  ) {
    return this.attendanceService.updateOfficeLocation(location_id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  @Audit({ action: 'Deleted Office Location', entity: 'Attendance' })
  @Delete('office-locations/:location_id')
  async deleteOfficeLocation(@Param('location_id') location_id: string) {
    return this.attendanceService.deleteOfficeLocation(location_id);
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  @Audit({ action: 'Created Employee Location', entity: 'Attendance' })
  @Post('employee-location')
  async createEmployeeLocation(@Body() dto: CreateEmployeeLocationDto) {
    return this.attendanceService.createEmployeeLocation(dto);
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'employee'])
  @Get('employee-location')
  async getEmployeeLocations(@CurrentUser() user: User) {
    return await this.attendanceService.getAllEmployeeLocationsByCompanyId(
      user.company_id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  @Audit({ action: 'Updated Employee Location', entity: 'Attendance' })
  @Put('employee-location/:location_id')
  async updateEmployeeLocation(
    @Body() dto: CreateOfficeLocationDto,
    @Param('location_id') location_id: string,
  ) {
    return this.attendanceService.updateEmployeeLocation(location_id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  @Audit({ action: 'Deleted Employee Location', entity: 'Attendance' })
  @Delete('employee-location/:location_id')
  async deleteEmployeeLocation(@Param('location_id') location_id: string) {
    return this.attendanceService.deleteEmployeeLocation(location_id);
  }

  // clock in and out logic
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['employee', 'super_admin', 'admin'])
  @Audit({ action: 'Clock In', entity: 'Attendance' })
  @Post('clock-in/:employee_id')
  async clockIn(@Param('employee_id') employee_id: string) {
    return this.attendanceService.clockIn(employee_id, '6.436180', '3.535591'); // Example coordinates for London
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['employee', 'super_admin', 'admin'])
  @Audit({ action: 'Clock Out', entity: 'Attendance' })
  @Post('clock-out/:employee_id')
  async clockOut(@Param('employee_id') employee_id: string) {
    return this.attendanceService.clockOut(employee_id, '3.340787', '6.596061'); // Example coordinates for London
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  @Get('daily-attendance')
  async getAttendance(@CurrentUser() user: User) {
    return this.attendanceService.getDailyAttendanceSummary(user.company_id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('attendance-summary/:date')
  async getAttendanceByDate(
    @Param('date') date: string,
    @CurrentUser() user: User,
  ) {
    return this.attendanceService.getAttendanceSummaryByDate(
      date,
      user.company_id,
    );
  }

  // Leave Service
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  @Audit({ action: 'Create New Leave', entity: 'Leave' })
  @Get('leave-management/:countryCode')
  async leaveManagement(
    @Param('countryCode') countryCode: string,
    @CurrentUser() user: User,
  ) {
    return this.leaveService.leaveManagement(user.company_id, countryCode);
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  @Audit({ action: 'Create New Leave', entity: 'Leave' })
  @Get('all-leave-requests')
  async getAllCompanyLeaveRequests(@CurrentUser() user: User) {
    return this.leaveService.getAllCompanyLeaveRequests(user.company_id);
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  @Audit({ action: 'Create New Leave', entity: 'Leave' })
  @Post('leave')
  async createLeave(@Body() dto: CreateLeaveDto, @CurrentUser() user: User) {
    return this.leaveService.createLeave(user.company_id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['employee', 'super_admin', 'admin'])
  @Get('leave')
  async getLeaves(@CurrentUser() user: User) {
    return this.leaveService.getLeaves(user.company_id);
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['employee', 'super_admin', 'admin'])
  @Get('leave/:leave_id')
  async getLeaveById(@Param('leave_id') leave_id: string) {
    return this.leaveService.getLeaveById(leave_id);
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  @Audit({ action: 'Update Leave', entity: 'Leave' })
  @Put('leave/:leave_id')
  async updateLeave(
    @Body() dto: UpdateLeaveDto,
    @Param('leave_id') leave_id: string,
  ) {
    return this.leaveService.updateLeave(leave_id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  @Audit({ action: 'Delete Leave', entity: 'Leave' })
  @Delete('leave/:leave_id')
  async deleteLeave(@Param('leave_id') leave_id: string) {
    return this.leaveService.deleteLeave(leave_id);
  }

  // Leave Request Service
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['employee', 'super_admin', 'admin'])
  @Audit({ action: 'Create Leave Request', entity: 'Leave' })
  @Post('leave-request/:employee_id')
  async createLeaveRequest(
    @Param('employee_id') employee_id: string,
    @Body() dto: CreateLeaveRequestDto,
  ) {
    return this.leaveService.createLeaveRequest(employee_id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  @Get('company-leave-requests')
  async getCompanyLeaveRequests(@CurrentUser() user: User) {
    return this.leaveService.getAllCompanyLeaveRequests(user.company_id);
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['employee', 'super_admin', 'admin'])
  @Get('leave-request/:employee_id')
  async getLeaveRequests(@Param('employee_id') employee_id: string) {
    return this.leaveService.getEmployeeRequests(employee_id);
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'employee'])
  @Get('leave-request-by-id/:request_id')
  async getLeaveRequestById(@Param('request_id') request_id: string) {
    return this.leaveService.getLeaveRequestById(request_id);
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'employee'])
  @Audit({ action: 'Update Leave Request', entity: 'Leave' })
  @Put('leave-request/:request_id')
  async updateLeaveRequest(
    @Param('request_id') request_id: string,
    @Body() dto: UpdateLeaveRequestDto,
  ) {
    return this.leaveService.updateLeaveRequest(request_id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  @Audit({ action: 'Approve Leave Request', entity: 'Leave' })
  @Put('leave-request/approve/:request_id')
  async approveLeaveRequest(
    @Param('request_id') request_id: string,
    @CurrentUser() user: User,
  ) {
    return this.leaveService.approveLeaveRequest(request_id, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  @Audit({ action: 'Reject Leave Request', entity: 'Leave' })
  @Put('leave-request/reject/:request_id')
  async rejectLeaveRequest(
    @Param('request_id') request_id: string,
    @CurrentUser() user: User,
  ) {
    return this.leaveService.rejectLeaveRequest(request_id, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'employee'])
  @Get('leave-balance/:employee_id')
  async getLeaveBalance(@Param('employee_id') employee_id: string) {
    return this.leaveService.getLeaveBalance(employee_id);
  }
}
