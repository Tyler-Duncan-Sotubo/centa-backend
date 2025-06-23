import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { BaseController } from 'src/common/interceptor/base.controller';
import { SalaryAdvanceService } from './salary-advance.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import {
  CreateSalaryAdvanceDto,
  UpdateLoanStatusDto,
} from './dto/create-salary-advance.dto';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';

@Controller('salary-advance')
export class SalaryAdvanceController extends BaseController {
  constructor(private readonly salaryAdvanceService: SalaryAdvanceService) {
    super();
  }

  // Request a new loan
  @Post('request/:employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['salary_advance.request'])
  async requestLoan(
    @Param('employeeId') employeeId: string,
    @Body() dto: CreateSalaryAdvanceDto,
    @CurrentUser() user: User,
  ) {
    return this.salaryAdvanceService.salaryAdvanceRequest(
      dto,
      employeeId,
      user,
    );
  }

  // Get all loans in the company
  @Get('')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['salary_advance.read_all'])
  async getLoans(@CurrentUser() user: User) {
    return this.salaryAdvanceService.getAdvances(user.companyId);
  }

  // Get loans by employee
  @Get('employee/:employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['salary_advance.read_employee'])
  async getLoansByEmployee(@Param('employeeId') employeeId: string) {
    return this.salaryAdvanceService.getAdvancesAndRepaymentsByEmployee(
      employeeId,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['salary_advance.read_one'])
  async getLoanById(@Param('id') id: string) {
    return this.salaryAdvanceService.getAdvanceById(id);
  }

  // Update loan status (approve/reject)
  @Patch('update-status/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['salary_advance.manage'])
  async updateLoanStatus(
    @Param('id') id: string,
    @Body() dto: UpdateLoanStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.salaryAdvanceService.updateAdvanceStatus(id, dto, user.id);
  }

  // Repay Loan
  @Post('repay/:loan_id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['salary_advance.repay'])
  async repayLoan(
    @Param('loan_id') loan_id: string,
    @Body('amount') amount: number,
  ) {
    return this.salaryAdvanceService.repayAdvance(loan_id, amount);
  }

  // Get All Repayments by Employee
  @Get('repayments/:employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['salary_advance.read_employee'])
  async getRepaymentsByEmployee(@Param('employeeId') employeeId: string) {
    return this.salaryAdvanceService.getAdvancesAndRepaymentsByEmployee(
      employeeId,
    );
  }

  // Get Loan History for company
  @Get('history')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['salary_advance.history'])
  async getLoanHistoryByCompany(@CurrentUser() user: User) {
    return this.salaryAdvanceService.getAdvancesHistoryByCompany(
      user.companyId,
    );
  }

  // Get Loan History by Employee
  @Get('history/:employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['salary_advance.history_employee'])
  async getLoanHistoryByEmployee(@Param('employeeId') employeeId: string) {
    return this.salaryAdvanceService.getAdvanceHistoryByEmployee(employeeId);
  }
}
