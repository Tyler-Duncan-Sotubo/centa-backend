import {
  Controller,
  Get,
  Post,
  UseGuards,
  SetMetadata,
  Param,
  Patch,
  Body,
  Delete,
} from '@nestjs/common';
import { RunService } from './run.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('payroll')
export class RunController extends BaseController {
  constructor(private readonly runService: RunService) {
    super();
  }

  private formattedDate = () => {
    const date = new Date();
    const month = String(date.getMonth()).padStart(2, '0');
    const year = date.getFullYear();
    const formattedDate = `${year}-${month}`;
    return formattedDate;
  };

  @Post('calculate-payroll-for-company/:date?')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.run.calculate'])
  async calculatePayrollForCompany(
    @CurrentUser() user: User,
    @Param('date') date: string,
  ) {
    const payrollDate = date || new Date().toISOString();
    return this.runService.calculatePayrollForCompany(user, payrollDate, '');
  }

  @Get(':payRunId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.run.read'])
  async getOnePayRun(@Param('payRunId') payRunId: string) {
    return this.runService.findOnePayRun(payRunId);
  }

  @Get(':payRunId/summary')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.run.read'])
  async getPayrollSummary(@Param('payRunId') payRunId: string) {
    return this.runService.getPayrollSummaryByRunId(payRunId);
  }

  @Patch(':payRunId/send-for-approval')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.run.send_for_approval'])
  async sendForApproval(
    @Param('payRunId') payRunId: string,
    @CurrentUser() user: User,
  ) {
    return this.runService.sendForApproval(payRunId, user.id);
  }

  @Patch(':payRunId/approve')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.run.approve'])
  async updatePayRun(
    @Param('payRunId') payRunId: string,
    @CurrentUser() user: User,
    @Body('remarks') remarks: string,
  ) {
    return this.runService.approvePayrollRun(payRunId, user, remarks);
  }

  @Patch(':payRunId/payment-in-progress')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.run.mark_in_progress'])
  async updatePaymentStatus(
    @Param('payRunId') payRunId: string,
    @CurrentUser() user: User,
  ) {
    return this.runService.markAsInProgress(payRunId, user);
  }

  @Get('approval-status/:payRunId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.run.approval_status'])
  async getApprovalStatus(@Param('payRunId') payRunId: string) {
    return this.runService.checkApprovalStatus(payRunId);
  }

  @Patch('approve-payroll/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.run.update_payment_status'])
  async updatePayrollPaymentStatus(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('status') status: 'paid' | 'pending',
  ) {
    return this.runService.updatePayrollPaymentStatus(user, id, status);
  }

  @Delete(':runId/discard')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.run.update_payment_status'])
  discardRun(@CurrentUser() user: User, @Param('runId') runId: string) {
    return this.runService.discardPayrollRun(user, runId);
  }
}
