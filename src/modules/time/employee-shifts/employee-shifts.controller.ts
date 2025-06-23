import {
  Controller,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  SetMetadata,
  Ip,
  Get,
  Query,
  Patch,
} from '@nestjs/common';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';
import { EmployeeShiftsService } from './employee-shifts.service';
import { CreateEmployeeShiftDto } from './dto/create-employee-shift.dto';
import { BulkCreateEmployeeShiftDto } from './dto/bulk-assign-employee-shifts.dto';

@Controller('employee-shifts')
export class EmployeeShiftsController extends BaseController {
  constructor(private readonly employeeShiftsService: EmployeeShiftsService) {
    super();
  }

  @Post(':employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['employee_shifts.assign'])
  create(
    @Param('employeeId') employeeId: string,
    @Body() dto: CreateEmployeeShiftDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.employeeShiftsService.assignShift(employeeId, dto, user, ip);
  }

  @Patch(':assignmentId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['employee_shifts.assign'])
  async update(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: CreateEmployeeShiftDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.employeeShiftsService.updateShift(assignmentId, dto, user, ip);
  }
  @Get('events/calendar')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['employee_shifts.read'])
  async getCalendarEvents(
    @CurrentUser() user: User,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.employeeShiftsService.getCalendarEvents(
      user.companyId,
      start,
      end,
    );
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['employee_shifts.assign'])
  async bulkCreate(
    @Body() dto: BulkCreateEmployeeShiftDto[],
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.employeeShiftsService.bulkAssignMany(
      user.companyId,
      dto,
      user,
      ip,
    );
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['employee_shifts.assign'])
  async listAllPaginated(
    @CurrentUser() user: User,
    @Param('companyId') companyId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('shiftId') shiftId?: string,
  ) {
    return this.employeeShiftsService.listAllPaginated(user.companyId, {
      page: Number(page),
      limit: Number(limit),
      search,
      shiftId,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['employee_shifts.manage'])
  async getAll(@CurrentUser() user: User) {
    return this.employeeShiftsService.listAll(user.companyId);
  }

  @Get(':assignmentId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['employee_shifts.manage'])
  async getShiftAssignment(
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() user: User,
  ) {
    return this.employeeShiftsService.getOne(user.companyId, assignmentId);
  }

  @Get('employee/:employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager', 'employee'])
  async getEmployeeShifts(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: User,
  ) {
    return this.employeeShiftsService.listByEmployee(
      user.companyId,
      employeeId,
    );
  }

  @Get('shift/:shiftId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager', 'employee'])
  async getShiftEmployees(
    @Param('shiftId') shiftId: string,
    @CurrentUser() user: User,
  ) {
    return this.employeeShiftsService.listByShift(user.companyId, shiftId);
  }

  @Post('bulk-remove')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  async bulkRemove(
    @Body() employeeIds: string[],
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.employeeShiftsService.bulkRemoveAssignments(
      employeeIds,
      user,
      ip,
    );
  }

  @Delete(':assignmentId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  async removeOne(
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.employeeShiftsService.removeAssignment(assignmentId, user, ip);
  }
}
