import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UseGuards,
  SetMetadata,
  Ip,
  Res,
  Query,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { Audit } from 'src/modules/audit/audit.decorator';
import { AuditInterceptor } from 'src/modules/audit/audit.interceptor';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CreateEmployeeCoreDto } from './dto/create-employee-core.dto';
import { FastifyReply } from 'fastify';
import { FileParseInterceptor } from 'src/common/interceptor/file-parse.interceptor';
import { SearchEmployeesDto } from './dto/search-employees.dto';
import { CreateEmployeeMultiDetailsDto } from './dto/create-employee-multi-details.dto';
import { EmployeeProfileDto } from './dto/update-employee-details.dto';

@UseInterceptors(AuditInterceptor)
@Controller('employees')
export class EmployeesController extends BaseController {
  constructor(private readonly employeesService: EmployeesService) {
    super();
  }

  @Get('template')
  @SetMetadata('permission', ['employees.download_template'])
  async downloadTemplate(@Res() reply: FastifyReply) {
    const workbook = await this.employeesService.buildTemplateWorkbook(
      'bf82fb49-2d08-4a2b-a117-be9039041f5f',
    );
    const buffer = await workbook.xlsx.writeBuffer();
    reply
      .header(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      .header(
        'Content-Disposition',
        'attachment; filename="employee_bulk_template.xlsx"',
      )
      .send(buffer);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard)
  @Audit({ action: 'Department Bulk Up', entity: 'Departments' })
  @SetMetadata('permission', ['employees.bulk_create'])
  @UseInterceptors(FileParseInterceptor({ field: 'file', maxRows: 600 }))
  async bulkCreate(@Body() rows: any[], @CurrentUser() user: User) {
    return this.employeesService.bulkCreate(user, rows);
  }

  @Post('generate-id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['employees.generate_id'])
  async createEmployeeNumber(@CurrentUser() user: User) {
    return this.employeesService.createEmployeeNumber(user.companyId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['employees.manage'])
  @Audit({
    action: 'Create',
    entity: 'Employee',
    getEntityId: (req) => req.params.id,
  })
  create(
    @Body() createEmployeeDto: CreateEmployeeCoreDto,
    @CurrentUser() user: User,
  ) {
    return this.employeesService.create(createEmployeeDto, user);
  }

  @Post('multi/:employeeId?')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['employees.manage'])
  @Audit({
    action: 'Create',
    entity: 'Employee',
    getEntityId: (req) => req.params.id,
  })
  createEmployee(
    @Body() createEmployeeDto: CreateEmployeeMultiDetailsDto,
    @CurrentUser() user: User,
    @Param('employeeId') employeeId: string,
  ) {
    return this.employeesService.createEmployee(
      createEmployeeDto,
      user,
      employeeId,
    );
  }

  @Get('')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['employees.read_all'])
  findAllEmployees(@CurrentUser() user: User) {
    return this.employeesService.findAllEmployees(user.companyId);
  }

  @Get('all')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['employees.read_all'])
  findAllCompanyEmployees(@CurrentUser() user: User) {
    return this.employeesService.findAllEmployees(user.companyId);
  }

  @Get('employee-active')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['employees.read_self'])
  getActiveEmployees(@CurrentUser() user: User) {
    return this.employeesService.getEmployeeByUserId(user.id);
  }

  @Get('employee/salary/:employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['employees.read_self'])
  getEmployeeSalary(
    @CurrentUser() user: User,
    @Param('employeeId') employeeId: string,
  ) {
    return this.employeesService.employeeSalaryDetails(user, employeeId);
  }

  @Get('employee/finance/:employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['employees.read_self'])
  employeeFinanceDetails(@Param('employeeId') employeeId: string) {
    return this.employeesService.employeeFinanceDetails(employeeId);
  }

  @Get(':id/full')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['employees.read_full'])
  findAll(@CurrentUser() user: User, @Param('id') id: string) {
    return this.employeesService.findAll(id, user.companyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['employees.read_one'])
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.employeesService.findOne(id, user.companyId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['employees.manage'])
  update(
    @Param('id') id: string,
    @Body() dto: EmployeeProfileDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.employeesService.update(id, dto, user.id, ip);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['employees.manage'])
  @Audit({
    action: 'Delete',
    entity: 'Employee',
    getEntityId: (req) => req.params.id,
  })
  remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }

  @Get('company-managers/all')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['employees.read_all'])
  findAllManagers(@CurrentUser() user: User) {
    return this.employeesService.getManager(user.companyId);
  }

  @Patch('assign-manager/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['employees.assign_manager'])
  @Audit({
    action: 'Update',
    entity: 'Employee',
    getEntityId: (req) => req.params.id,
  })
  updateManagerId(
    @Param('id') id: string,
    @Body('managerId') managerId: string,
  ) {
    return this.employeesService.assignManager(id, managerId);
  }

  @Patch('remove-manager/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['employees.assign_manager'])
  @Audit({
    action: 'Update',
    entity: 'Employee',
    getEntityId: (req) => req.params.id,
  })
  removeManagerId(@Param('id') id: string) {
    return this.employeesService.removeManager(id);
  }

  @Get('fallback-managers')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['employees.fallback_managers'])
  async getFallbackManagers(@CurrentUser() user: User) {
    return this.employeesService.findFallbackManagers(user.companyId);
  }

  @Get('search')
  @SetMetadata('permission', ['employees.search'])
  search(@Query() params: SearchEmployeesDto) {
    return this.employeesService.search(params);
  }
}
