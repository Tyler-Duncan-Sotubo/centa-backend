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
  UseInterceptors,
} from '@nestjs/common';
import { BaseController } from 'src/config/base.controller';
import { LoanService } from './services/loan.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorator/current-user.decorator';
import { User } from 'src/types/user.type';
import { LoanRequestDto, UpdateLoanStatusDto } from './dto/create-loan.dto';
import { AuditInterceptor } from 'src/audit/audit.interceptor';
import { Audit } from 'src/audit/audit.decorator';

@UseInterceptors(AuditInterceptor)
@Controller('')
export class LoanController extends BaseController {
  constructor(private readonly loanService: LoanService) {
    super();
  }

  // Request a new loan
  @Post('loans/request/:employee_id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'employee'])
  @Audit({ action: 'Loan Request', entity: 'Loan' })
  async requestLoan(
    @Param('employee_id') employee_id: string,
    @Body() dto: LoanRequestDto,
  ) {
    return this.loanService.salaryAdvanceRequest(dto, employee_id);
  }

  // Get all loans in the company
  @Get('loans')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async getLoans(@CurrentUser() user: User) {
    return this.loanService.getAdvances(user.company_id);
  }

  // Get loans by employee
  @Get('/loans/employee/:employee_id')
  @UseGuards(JwtAuthGuard)
  async getLoansByEmployee(@Param('employee_id') employee_id: string) {
    return this.loanService.getAdvancesAndRepaymentsByEmployee(employee_id);
  }

  // Get loan by ID
  @Get('loans/:loan_id')
  @UseGuards(JwtAuthGuard)
  async getLoanById(@Param('loan_id') loan_id: string) {
    return this.loanService.getAdvanceById(loan_id);
  }

  // Update loan status (approve/reject)
  @Patch('/loans/update-status/:loan_id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  @Audit({ action: 'Updated Loan', entity: 'Loan' })
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
  @Audit({ action: 'Deleted Loan', entity: 'Loan' })
  async deleteLoan(@Param('loan_id') loan_id: string) {
    return this.loanService.deleteAdvance(loan_id);
  }

  // Repayments ---------------------------------------------
  // Repay a loan
  @Post('repay/:loan_id')
  @Audit({ action: 'Created Repayment', entity: 'Loan' })
  async repayLoan(
    @Param('loan_id') loan_id: string,
    @Body('amount') amount: number,
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
  @Get('loans-history')
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
