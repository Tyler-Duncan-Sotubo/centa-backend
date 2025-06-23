import { Controller, Get, Param, UseGuards, SetMetadata } from '@nestjs/common';
import { LeaveBalanceService } from './leave-balance.service';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';
import { LeaveAccrualCronService } from './leave-accrual.cron';

@Controller('leave-balance')
export class LeaveBalanceController extends BaseController {
  constructor(
    private readonly leaveBalanceService: LeaveBalanceService,
    private readonly leaveAccrualCronService: LeaveAccrualCronService,
  ) {
    super();
  }

  @Get('accrual')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.balance.accrual'])
  async handleMonthlyLeaveAccruals() {
    await this.leaveAccrualCronService.handleMonthlyLeaveAccruals();
    return { message: 'Leave accruals processed successfully' };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.balance.read'])
  findAll(@CurrentUser() user: User) {
    return this.leaveBalanceService.findAll(user.companyId);
  }

  @Get('employee/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.balance.read'])
  findEmployeeLeaveBalance(
    @CurrentUser() user: User,
    @Param('id') employeeId: string,
  ) {
    return this.leaveBalanceService.findByEmployeeId(employeeId);
  }
}
