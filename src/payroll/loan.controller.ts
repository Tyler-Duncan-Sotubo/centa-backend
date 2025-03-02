import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  SetMetadata,
  Delete,
} from '@nestjs/common';
import { BaseController } from 'src/config/base.controller';
import { LoanService } from './services/loan.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorator/current-user.decorator';
import { User } from 'src/types/user.type';
import { LoanRequestDto, UpdateLoanStatusDto } from './dto/create-loan.dto';

@Controller('loans')
export class LoanController extends BaseController {
  constructor(private readonly loanService: LoanService) {
    super();
  }

  // Request a new loan
  @Post('request/:employee_id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'employee'])
  async requestLoan(
    @Param('employee_id') employee_id: string,
    @Body() dto: LoanRequestDto,
  ) {
    return this.loanService.salaryAdvanceRequest(dto, employee_id);
  }

  // Get all loans in the company
  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async getLoans(@CurrentUser() user: User) {
    return this.loanService.getAdvances(user.company_id);
  }

  // Get loans by employee
  @Get('employee/:employee_id')
  @UseGuards(JwtAuthGuard)
  async getLoansByEmployee(@Param('employee_id') employee_id: string) {
    return this.loanService.getAdvancesAndRepaymentsByEmployee(employee_id);
  }

  // Get loan by ID
  @Get(':loan_id')
  @UseGuards(JwtAuthGuard)
  async getLoanById(@Param('loan_id') loan_id: string) {
    return this.loanService.getAdvanceById(loan_id);
  }

  // Update loan status (approve/reject)
  @Patch('update-status/:loan_id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async updateLoanStatus(
    @Param('loan_id') loan_id: string,
    @Body() dto: UpdateLoanStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.loanService.updateAdvanceStatus(loan_id, dto, user.id);
  }

  // Delete a loan
  @Delete(':loan_id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async deleteLoan(@Param('loan_id') loan_id: string) {
    return this.loanService.deleteAdvance(loan_id);
  }

  // Repayments ---------------------------------------------
  // Repay a loan
  @Post('repay/:loan_id')
  async repayLoan(
    @Param('loan_id') loan_id: string,
    @Body('amount') amount: string,
  ) {
    return this.loanService.repayAdvance(loan_id, amount);
  }

  // Get All Repayments by Employee
  @Get('repayments/:employee_id')
  async getRepaymentsByEmployee(@Param('employee_id') employee_id: string) {
    return this.loanService.getAdvancesAndRepaymentsByEmployee(employee_id);
  }

  // Get repayments by loan
  @Get('repayments/:loan_id')
  async getRepaymentsByLoan(@Param('loan_id') loan_id: string) {
    return this.loanService.getRepaymentByLoan(loan_id);
  }

  // Get Loan History
  @Get('history/all')
  @UseGuards(JwtAuthGuard)
  async getLoanHistoryByCompany(@CurrentUser() user: User) {
    return this.loanService.getAdvancesHistoryByCompany(user.company_id);
  }

  // Get Loan History by Employee
  @Get('history/:employee_id')
  async getLoanHistoryByEmployee(@Param('employee_id') employee_id: string) {
    return this.loanService.getAdvanceHistoryByEmployee(employee_id);
  }
}
