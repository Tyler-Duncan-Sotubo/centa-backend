import { Controller, Get, Param, UseGuards, SetMetadata } from '@nestjs/common';
import { PayslipService } from './payslip.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('payslip')
export class PayslipController extends BaseController {
  constructor(private readonly payslipService: PayslipService) {
    super();
  }

  @Get('payslips/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.payslips.read_all'])
  async getCompanyPayslips(@CurrentUser() user: User, @Param('id') id: string) {
    return this.payslipService.getCompanyPayslipsById(user.companyId, id);
  }

  @Get('employee-payslip-summary/:employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.payslips.read_all'])
  async getEmployeePayslipSummary(@Param('employeeId') employeeId: string) {
    return this.payslipService.getEmployeePayslipSummary(employeeId);
  }

  @Get('employee-payslip')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.payslips.read_self'])
  async getEmployeePayslips(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: User,
  ) {
    return this.payslipService.getEmployeePayslipSummary(user.id);
  }

  @Get('employee-payslip/:payslipId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.payslips.read_self'])
  async getEmployeePayslip(@Param('payslipId') payslipId: string) {
    return this.payslipService.getEmployeePayslip(payslipId);
  }
}
