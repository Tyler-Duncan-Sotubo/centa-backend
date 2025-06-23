import {
  Controller,
  Param,
  Ip,
  UseGuards,
  SetMetadata,
  Body,
  Patch,
} from '@nestjs/common';
import { LeaveApprovalService } from './leave-approval.service';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { ApproveRejectLeaveDto } from './dto/approve-reject.dto';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('leave-approval')
export class LeaveApprovalController extends BaseController {
  constructor(private readonly leaveApprovalService: LeaveApprovalService) {
    super();
  }

  @Patch('approve/:leaveRequestId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave_approval.manage'])
  async approveLeaveRequest(
    @Param('leaveRequestId') leaveRequestId: string,
    @Body() dto: ApproveRejectLeaveDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.leaveApprovalService.approveLeaveRequest(
      leaveRequestId,
      dto,
      user,
      ip,
    );
  }

  @Patch('reject/:leaveRequestId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave_approval.manage'])
  async rejectLeaveRequest(
    @Param('leaveRequestId') leaveRequestId: string,
    @Body() dto: ApproveRejectLeaveDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.leaveApprovalService.rejectLeaveRequest(
      leaveRequestId,
      dto,
      user,
      ip,
    );
  }
}
