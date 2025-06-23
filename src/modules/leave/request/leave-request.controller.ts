import {
  Controller,
  Post,
  Body,
  Param,
  UseInterceptors,
  UseGuards,
  SetMetadata,
  Ip,
  Get,
} from '@nestjs/common';
import { AuditInterceptor } from 'src/modules/audit/audit.interceptor';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { LeaveRequestService } from './leave-request.service';

@UseInterceptors(AuditInterceptor)
@Controller('leave-request')
export class LeaveRequestController extends BaseController {
  constructor(private readonly leaveRequest: LeaveRequestService) {
    super();
  }

  // leave Request
  @Post('')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.request.create'])
  createLeaveRequest(
    @Body() dto: CreateLeaveRequestDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.leaveRequest.applyForLeave(dto, user, ip);
  }

  @Get('')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.request.read_all'])
  getAllLeaveRequests(@CurrentUser() user: User) {
    return this.leaveRequest.findAll(user.companyId);
  }

  @Get(':leaveRequestId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.request.read_all'])
  getLeaveRequestById(
    @Param('leaveRequestId') leaveRequestId: string,
    @CurrentUser() user: User,
  ) {
    return this.leaveRequest.findOneById(leaveRequestId, user.companyId);
  }

  @Get('employee/:employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.request.read_employee'])
  getLeaveRequestByEmployeeId(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: User,
  ) {
    return this.leaveRequest.findAllByEmployeeId(employeeId, user.companyId);
  }
}
