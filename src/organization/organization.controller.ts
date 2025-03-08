import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  SetMetadata,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CompanyService, DepartmentService, EmployeeService } from './services';
import {
  CreateCompanyContactDto,
  CreateCompanyDto,
  CreateDepartmentDto,
  CreateEmployeeBankDetailsDto,
  CreateEmployeeDto,
  CreateEmployeeGroupDto,
  UpdateCompanyContactDto,
  UpdateEmployeeDto,
  UpdateEmployeeGroupDto,
} from './dto';
import { CurrentUser } from '../auth/decorator/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from 'src/types/user.type';
import { BaseController } from 'src/config/base.controller';
import * as csvParser from 'csv-parser';
import { createReadStream } from 'fs';
import { join } from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { unlink } from 'fs/promises';
import { CreateEmployeeTaxDetailsDto } from './dto/create-employee-tax-details.dto';
import { UpdateEmployeeTaxDetailsDto } from './dto/update-employee-tax-details.dto';
import { CreatePayFrequencyDto } from './dto/create-pay-frequency.dto';
import { CreateCompanyTaxDto } from './dto/create-company-tax.dto';

@Controller('')
export class OrganizationController extends BaseController {
  constructor(
    private readonly company: CompanyService,
    private readonly department: DepartmentService,
    private readonly employee: EmployeeService,
  ) {
    super();
  }

  @Post('company')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin'])
  createCompany(@Body() dto: CreateCompanyDto, @CurrentUser() user: User) {
    return this.company.createCompany(dto, user.company_id);
  }

  @Get('company')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  getCompany(@CurrentUser() user: User) {
    return this.company.getCompanyByUserId(user.company_id);
  }

  @Put('company')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin'])
  updateCompany(@Body() dto: CreateCompanyDto, @CurrentUser() user: User) {
    return this.company.updateCompany(dto, user.company_id);
  }

  @Delete('company')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin'])
  deleteCompany(@CurrentUser() user: User) {
    return this.company.deleteCompany(user.company_id);
  }

  @Post('companies/:companyId/contact')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin'])
  createCompanyContact(
    @Body() dto: CreateCompanyContactDto,
    @Param('companyId') companyId: string,
  ) {
    return this.company.addContactToCompany(dto, companyId);
  }

  @Get('companies/:companyId/contact')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  getCompanyContacts(@Param('companyId') companyId: string) {
    return this.company.getContactInCompany(companyId);
  }

  @Put('companies/:companyId/contact')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin'])
  updateCompanyContact(
    @Body() dto: UpdateCompanyContactDto,
    @Param('companyId') companyId: string,
  ) {
    return this.company.updateContactInCompany(dto, companyId);
  }

  @Get('pay-frequency')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  getPayFrequency(@CurrentUser() user: User) {
    return this.company.getPayFrequency(user.company_id);
  }

  @Put('pay-frequency')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  updatePayFrequency(
    @Body() dto: CreatePayFrequencyDto,
    @CurrentUser() user: User,
  ) {
    return this.company.updatePayFrequency(user.company_id, dto);
  }

  @Post('company-tax-details')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  createCompanyTaxDetails(
    @Body() dto: CreateCompanyTaxDto,
    @CurrentUser() user: User,
  ) {
    // console.log(user);
    return this.company.createCompanyTaxDetails(user.company_id, dto);
  }

  @Get('company-tax-details')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  getCompanyTaxDetails(@CurrentUser() user: User) {
    return this.company.getCompanyTaxDetails(user.company_id);
  }

  @Put('company-tax-details')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  updateCompanyTaxDetails(
    @Body() dto: CreateCompanyTaxDto,
    @CurrentUser() user: User,
  ) {
    return this.company.updateCompanyTaxDetails(user.company_id, dto);
  }

  // Department ----------------------------
  @Post('departments')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  createDepartment(
    @Body() dto: CreateDepartmentDto,
    @CurrentUser() user: User,
  ) {
    return this.department.createDepartment(dto, user.company_id);
  }

  @Get('departments')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  getDepartment(@CurrentUser() user: User) {
    console.log(user);
    return this.department.getDepartments(user.company_id);
  }

  @Get('department/:departmentId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  getDepartmentById(@Param('departmentId') departmentId: string) {
    return this.department.getDepartmentById(departmentId);
  }

  @Put('department/:departmentId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  updateDepartment(
    @Param('departmentId') departmentId: string,
    @Body() dto: CreateDepartmentDto,
  ) {
    return this.department.updateDepartment(dto, departmentId);
  }

  @Delete('department/:departmentId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  deleteDepartment(@Param('departmentId') departmentId: string) {
    return this.department.deleteDepartment(departmentId);
  }

  @Post('departments/:departmentId/employees')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  addEmployeeToDepartment(
    @Param('departmentId') departmentId: string,
    @Body() dto: string[] | string,
  ) {
    return this.department.addEmployeesToDepartment(dto, departmentId);
  }

  @Delete('departments/:departmentId/employees/:employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  removeEmployeeFromDepartment(@Param('employeeId') employeeId: string) {
    return this.department.removeEmployeeFromDepartment(employeeId);
  }

  // Employee ----------------------------
  @Post('employees')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  async addEmployee(@Body() dto: CreateEmployeeDto, @CurrentUser() user: User) {
    await this.employee.addEmployee(dto, user.company_id);
  }

  @Get('employees')
  @UseGuards(JwtAuthGuard)
  getEmployee(@CurrentUser() user: User) {
    return this.employee.getEmployees(user.company_id);
  }

  @Get('employees-summary')
  @UseGuards(JwtAuthGuard)
  getEmployeeSummary(@CurrentUser() user: User) {
    return this.employee.getEmployeesSummary(user.company_id);
  }

  @Get('employee-active')
  @UseGuards(JwtAuthGuard)
  getActiveEmployees(@CurrentUser() user: User) {
    return this.employee.getEmployeeByUserId(user.id);
  }

  @Get('employee/:employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'employee', 'hr_manager'])
  getEmployeeById(@Param('employeeId') employeeId: string) {
    return this.employee.getEmployeeById(employeeId);
  }

  @Get('employees/department/:departmentId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  getEmployeesByDepartment(@Param('departmentId') departmentId: string) {
    return this.employee.getEmployeesByDepartment(departmentId);
  }

  @Put('employee/:employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'employee', 'hr_manager'])
  updateEmployee(
    @Body() dto: UpdateEmployeeDto,
    @Param('employeeId') employeeId: string,
  ) {
    return this.employee.updateEmployee(employeeId, dto);
  }

  @Delete('employee/:employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  deleteEmployee(@Param('employeeId') employeeId: string) {
    return this.employee.deleteEmployee(employeeId);
  }

  // upload multiple employees
  @Post('employees/multiple')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  @UseInterceptors(FileInterceptor('file'))
  async addEmployees(@UploadedFile() file: any, @CurrentUser() user: User) {
    const filePath = join(
      process.cwd(),
      'src/organization/temp',
      file.filename,
    );

    const employees: any[] = [];

    // Parse the CSV file
    return new Promise((resolve, reject) => {
      createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (row) => {
          // Transform row data
          employees.push(this.transformRowWithMapping(row));
        })
        .on('end', async () => {
          try {
            // Validate and map CSV data to CreateEmployeeDto
            const dtos = await this.validateAndMapToDto(employees);
            // Call the service to process the employees
            const result = await this.employee.addMultipleEmployees(
              dtos,
              user.company_id,
            );
            // Cleanup: Delete the temporary file
            await unlink(filePath);

            resolve(result);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => reject(error));
    });
  }

  private fieldMapping = {
    'Employee Number': 'employee_number',
    'First Name': 'first_name',
    'Last Name': 'last_name',
    'Job Title': 'job_title',
    Email: 'email',
    Phone: 'phone',
    'Employment Status': 'employment_status',
    'Start Date': 'start_date',
    'Company ID': 'company_id',
    'Department ID': 'department_id',
    'Is Active': 'is_active',
    'Annual Gross': 'annual_gross',
    'Hourly Rate': 'hourly_rate',
    Bonus: 'bonus',
    Commission: 'commission',
  };

  private transformRowWithMapping(row: any): any {
    const transformedRow: any = {};
    for (const [key, value] of Object.entries(row)) {
      const mappedKey = this.fieldMapping[key.trim()];
      if (mappedKey) {
        transformedRow[mappedKey] = value;
      }
    }

    // Apply type conversions after mapping
    return this.transformRow(transformedRow);
  }

  private transformRow(row: any): any {
    return {
      ...row,
      employee_number: Number(row.employee_number),
      annual_gross: row.annual_gross ? Number(row.annual_gross) : null,
      hourly_rate: row.hourly_rate ? Number(row.hourly_rate) : null,
      bonus: row.bonus ? Number(row.bonus) : null,
      commission: row.commission ? Number(row.commission) : null,
      is_active: row.is_active === 'true' || row.is_active === '1',
      employment_status: row.employment_status,
    };
  }

  private async validateAndMapToDto(rows: any[]): Promise<CreateEmployeeDto[]> {
    const dtos: CreateEmployeeDto[] = [];
    for (const row of rows) {
      // Convert plain object to CreateEmployeeDto instance
      const dto = plainToInstance(CreateEmployeeDto, row);

      // Validate the DTO
      const errors = await validate(dto);
      if (errors.length > 0) {
        throw new BadRequestException(
          'Please ensure the CSV file is formatted correctly. All The fields are required.',
        );
      }

      dtos.push(dto);
    }
    return dtos;
  }

  // Employee Bank Details Endpoints ----------------------------
  @Post('employee/bank-details/:employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'employee', 'hr_manager'])
  createEmployeeBankDetails(
    @Body() dto: CreateEmployeeBankDetailsDto,
    @Param('employeeId') employeeId: string,
  ) {
    return this.employee.addEmployeeBankDetails(employeeId, dto);
  }

  @Put('employee/bank-details/:employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'employee', 'hr_manager'])
  updateEmployeeBankDetails(
    @Body() dto: CreateEmployeeBankDetailsDto,
    @Param('employeeId') employeeId: string,
  ) {
    return this.employee.updateEmployeeBankDetails(employeeId, dto);
  }

  // Employee Tax Details Endpoints ----------------------------

  @Post('employee/tax-details/:employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'employee', 'hr_manager'])
  createEmployeeTaxDetails(
    @Body() dto: CreateEmployeeTaxDetailsDto,
    @Param('employeeId') employeeId: string,
  ) {
    return this.employee.addEmployeeTaxDetails(employeeId, dto);
  }

  @Put('employee/tax-details/:employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'employee', 'hr_manager'])
  updateEmployeeTaxDetails(
    @Body() dto: UpdateEmployeeTaxDetailsDto,
    @Param('employeeId') employeeId: string,
  ) {
    return this.employee.updateEmployeeTaxDetails(employeeId, dto);
  }

  // Employee Group CRUD Endpoints   ---------------------------------------------------
  @Post('employee-groups')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  createEmployeeGroup(
    @Body() dto: CreateEmployeeGroupDto,
    @CurrentUser() user: User,
  ) {
    return this.employee.createEmployeeGroup(user.company_id, dto);
  }

  @Get('employee-groups')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  getEmployeeGroups(@CurrentUser() user: User) {
    return this.employee.getEmployeeGroups(user.company_id);
  }

  @Get('employee-group/:groupId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  getEmployeeGroup(@Param('groupId') groupId: string) {
    return this.employee.getEmployeeGroup(groupId);
  }

  @Put('employee-group/:groupId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  updateEmployeeGroup(
    @Body() dto: UpdateEmployeeGroupDto,
    @Param('groupId') groupId: string,
  ) {
    return this.employee.updateEmployeeGroup(groupId, dto);
  }

  @Delete('employee-group/:groupId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  deleteEmployeeGroup(@Param('groupId') groupId: string) {
    return this.employee.deleteEmployeeGroup(groupId);
  }

  @Get('employee-group/:groupId/employees')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  getEmployeesInGroup(@Param('groupId') groupId: string) {
    return this.employee.getEmployeesInGroup(groupId);
  }

  @Post('employee-group/:groupId/employees')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  addEmployeeToGroup(
    @Body() employees: string | string[],
    @Param('groupId') groupId: string,
  ) {
    console.log(employees);
    return this.employee.addEmployeesToGroup(employees, groupId);
  }

  @Delete('employee-group/:groupId/employees')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  removeEmployeeFromGroup(@Body() employeeIds: { employee_id: string }) {
    const obj = employeeIds;
    const employeeId = obj.employee_id;
    return this.employee.removeEmployeesFromGroup(employeeId);
  }

  @Get('verify-account/:accountNumber/:bankCode')
  verifyAccount(
    @Param('accountNumber') accountNumber: string,
    @Param('bankCode') bankCode: string,
  ) {
    return this.employee.verifyBankAccount(accountNumber, bankCode);
  }
}
