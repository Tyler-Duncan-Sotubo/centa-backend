import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Res,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { PayrollService } from './services/payroll.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import {
  createBonusDto,
  CreateCustomDeduction,
  UpdateCustomDeductionDto,
} from './dto';
import { DeductionService } from './services/deduction.service';
import { PayslipService } from './services/payslip.service';
import { Response } from 'express';
import * as fs from 'fs';
import { CurrentUser } from 'src/auth/decorator/current-user.decorator';
import { User } from 'src/types/user.type';
import { BaseController } from 'src/config/base.controller';
import { TaxService } from './services/tax.service';
import { PdfService } from './services/pdf.service';
import { updateTaxConfigurationDto } from './dto/update-tax-config.dto';
import { PayGroupService } from './services/pay-group.service';
import { CreateEmployeeGroupDto } from './dto/create-employee-group.dto';
import { UpdateEmployeeGroupDto } from './dto/update-employee-group.dto';

@Controller('')
export class PayrollController extends BaseController {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly deductionService: DeductionService,
    private readonly payslipService: PayslipService,
    private readonly taxService: TaxService,
    private readonly pdfService: PdfService,
    private readonly payGroup: PayGroupService,
  ) {
    super();
  }

  private formattedDate = () => {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    const formattedDate = `${year}-${month}`;
    return formattedDate;
  };

  // Tax Config
  @Put('tax-config')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async updateTaxConfiguration(
    @CurrentUser() user: User,
    @Body() dto: updateTaxConfigurationDto,
  ) {
    return this.deductionService.updateTaxConfiguration(user.company_id, dto);
  }

  // Custom Deductions
  @Post('custom-deduction')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async createCustomDeduction(
    @CurrentUser() user: User,
    @Body() dto: CreateCustomDeduction,
  ) {
    return this.deductionService.createCustomDeduction(user.company_id, dto);
  }

  @Get('custom-deduction')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async getCustomDeduction(@CurrentUser() user: User) {
    return this.deductionService.fetchCustomDeduction(user.company_id);
  }

  @Put('custom-deduction/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async updateCustomDeduction(
    @CurrentUser() user: User,
    @Body() dto: UpdateCustomDeductionDto,
    @Param('id') id: string,
  ) {
    return this.deductionService.updateCustomDeduction(
      user.company_id,
      dto,
      id,
    );
  }

  @Delete('custom-deduction/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async deleteCustomDeduction(@Param('id') id: string) {
    return this.deductionService.deleteCustomDeduction(id);
  }

  // Payroll
  @Post('calculate-payroll-for-company')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async calculatePayrollForCompany(@CurrentUser() user: User) {
    return this.payrollService.calculatePayrollForCompany(
      user.company_id,
      `${this.formattedDate()}`,
    );
  }

  @Get('company-payroll')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async getPayrollSummary(@CurrentUser() user: User) {
    return this.payrollService.getPayrollSummary(user.company_id);
  }

  @Get('company-payroll-status')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async getCompanyPayrollStatus(@CurrentUser() user: User) {
    return this.payrollService.getPayrollStatus(user.company_id);
  }

  @Put('company-payroll/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async deleteCompanyPayroll(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('status') status: 'pending' | 'approved' | 'rejected',
  ) {
    console.log(id);
    return this.payrollService.updatePayrollApprovalStatus(
      user.company_id,
      id,
      status,
    );
  }

  @Put('company-payroll-payment-status/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async updatePayrollPaymentStatus(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('status') status: 'paid' | 'pending',
  ) {
    return this.payrollService.updatePayrollPaymentStatus(
      user.company_id,
      id,
      status,
    );
  }

  @Delete('company-payroll/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async deleteCompanyPayrollById(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.payrollService.deletePayroll(user.company_id, id);
  }

  // Bonuses
  @Get('company-bonuses')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async getCompanyBonuses(@CurrentUser() user: User) {
    return this.payrollService.getBonuses(user.company_id);
  }

  @Post('company-bonuses')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async createCompanyBonus(
    @CurrentUser() user: User,
    @Body() dto: createBonusDto,
  ) {
    return this.payrollService.createBonus(user.company_id, dto);
  }

  @Delete('company-bonuses/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async deleteCompanyBonuses(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.payrollService.deleteBonus(user.company_id, id);
  }

  // Payslips
  @Get('payslips/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async getCompanyPayslips(@CurrentUser() user: User, @Param('id') id: string) {
    return this.payslipService.getCompanyPayslipsById(user.company_id, id);
  }

  @Get('payslip-download/:id/:format')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async downloadPayslipCSV(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('format') format: 'internal' | 'bank' = 'internal',
    @Res() res: Response,
  ) {
    try {
      const filePath = await this.payslipService.DownloadCompanyPayslipsByMonth(
        user.company_id,
        id,
        format,
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="payslips-${id}.csv"`,
      );

      if (filePath) {
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

        // Delete file after download starts
        fileStream.on('close', () => {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error('Error deleting file:', err);
            } else {
              console.log(`Deleted file: ${filePath}`);
            }
          });
        });
      } else {
        res.status(404).send({ message: 'File not found' });
      }
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  }

  @Get('employee-payslip-summary/:employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'employee', 'hr_manager'])
  async getEmployeePayslipSummary(@Param('employeeId') employeeId: string) {
    return this.payslipService.getEmployeePayslipSummary(employeeId);
  }

  @Get('employee-payslip')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'employee', 'hr_manager'])
  async getEmployeePayslips(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: User,
  ) {
    return this.payslipService.getEmployeePayslipSummary(user.id);
  }

  @Get('employee-payslip/:payslipId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'employee', 'hr_manager'])
  async getEmployeePayslip(@Param('payslipId') payslipId: string) {
    return this.payslipService.getEmployeePayslip(payslipId);
  }

  // Salary
  @Get('salary-breakdown')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'employee'])
  async getSalaryBreakdown(@CurrentUser() user: User) {
    return this.payrollService.getSalaryBreakdown(user.company_id);
  }

  @Post('salary-breakdown')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async createSalaryBreakdown(@CurrentUser() user: User, @Body() dto: any) {
    return this.payrollService.createUpdateSalaryBreakdown(
      user.company_id,
      dto,
    );
  }

  @Delete('salary-breakdown/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async deleteSalaryBreakdown(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.payrollService.deleteSalaryBreakdown(user.company_id, id);
  }

  // Taxes and Compliances
  @Get('tax-filings')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async getCompanyTaxFilings(@CurrentUser() user: User) {
    return this.taxService.getCompanyTaxFilings(user.company_id);
  }

  @Put('tax-filings/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async updateCompanyTaxFilings(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.taxService.updateCompanyTaxFilings(id, status);
  }

  @Get('tax-filings-download/:id/')
  async downloadExcel(
    @Param('id') tax_filing_id: string,
    @Res() res: Response,
  ) {
    try {
      const buffer =
        await this.taxService.generateTaxFilingExcel(tax_filing_id);

      res.setHeader(
        'Content-Disposition',
        `attachment; filename=tax_filing_${tax_filing_id}.xlsx`,
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.send(buffer);
    } catch (error) {
      res
        .status(500)
        .json({ message: 'Error generating Excel file', error: error.message });
    }
  }

  // Employee Group CRUD Endpoints   ---------------------------------------------------

  @Post('pay-groups')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  createEmployeeGroup(
    @Body() dto: CreateEmployeeGroupDto,
    @CurrentUser() user: User,
  ) {
    return this.payGroup.createEmployeeGroup(user.company_id, dto);
  }

  @Get('pay-groups')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager', 'employee'])
  getEmployeeGroups(@CurrentUser() user: User) {
    return this.payGroup.getEmployeeGroups(user.company_id);
  }

  @Get('pay-groups/:groupId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  getEmployeeGroup(@Param('groupId') groupId: string) {
    return this.payGroup.getEmployeeGroup(groupId);
  }

  @Put('pay-groups/:groupId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  updateEmployeeGroup(
    @Body() dto: UpdateEmployeeGroupDto,
    @Param('groupId') groupId: string,
  ) {
    return this.payGroup.updateEmployeeGroup(groupId, dto);
  }

  @Delete('pay-groups/:groupId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  deleteEmployeeGroup(@Param('groupId') groupId: string) {
    return this.payGroup.deleteEmployeeGroup(groupId);
  }

  @Get('pay-groups/:groupId/employees')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  getEmployeesInGroup(@Param('groupId') groupId: string) {
    return this.payGroup.getEmployeesInGroup(groupId);
  }

  @Post('pay-groups/:groupId/employees')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  addEmployeeToGroup(
    @Body() employees: string | string[],
    @Param('groupId') groupId: string,
  ) {
    return this.payGroup.addEmployeesToGroup(employees, groupId);
  }

  @Delete('pay-groups/:groupId/employees')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  removeEmployeeFromGroup(@Body() employeeIds: { employee_id: string }) {
    const obj = employeeIds;
    const employeeId = obj.employee_id;
    return this.payGroup.removeEmployeesFromGroup(employeeId);
  }

  // Payroll Preview Details
  @Get('payroll-preview')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  async getPayrollPreview(@CurrentUser() user: User) {
    return this.payrollService.getPayrollPreviewDetails(user.company_id);
  }

  // testing on approval
}
