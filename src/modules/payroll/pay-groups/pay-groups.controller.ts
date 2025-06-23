import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  SetMetadata,
  Ip,
} from '@nestjs/common';
import { PayGroupsService } from './pay-groups.service';
import { CreatePayGroupDto } from './dto/create-pay-group.dto';
import { UpdatePayGroupDto } from './dto/update-pay-group.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('pay-groups')
export class PayGroupsController extends BaseController {
  constructor(private readonly payGroupsService: PayGroupsService) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.pay_groups.manage'])
  createEmployeeGroup(
    @Body() dto: CreatePayGroupDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.payGroupsService.create(user, dto, ip);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.pay_groups.read'])
  getEmployeeGroups(@CurrentUser() user: User) {
    return this.payGroupsService.findAll(user.companyId);
  }

  @Get(':groupId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.pay_groups.read'])
  getEmployeeGroup(@Param('groupId') groupId: string) {
    return this.payGroupsService.findOne(groupId);
  }

  @Patch(':groupId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.pay_groups.manage'])
  updateEmployeeGroup(
    @Body() dto: UpdatePayGroupDto,
    @Param('groupId') groupId: string,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.payGroupsService.update(groupId, dto, user, ip);
  }

  @Delete(':groupId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.pay_groups.manage'])
  deleteEmployeeGroup(
    @Param('groupId') groupId: string,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.payGroupsService.remove(groupId, user, ip);
  }

  @Get(':groupId/employees')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['employees.generate_id'])
  getEmployeesInGroup(@Param('groupId') groupId: string) {
    return this.payGroupsService.findEmployeesInGroup(groupId);
  }

  @Post(':groupId/employees')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.pay_groups.manage'])
  addEmployeeToGroup(
    @Body() employees: string | string[],
    @Param('groupId') groupId: string,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.payGroupsService.addEmployeesToGroup(
      employees,
      groupId,
      user,
      ip,
    );
  }

  @Delete(':groupId/employees')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.pay_groups.manage'])
  removeEmployeeFromGroup(
    @Body() employeeIds: { employee_id: string },
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    const obj = employeeIds;
    const employeeId = obj.employee_id;
    return this.payGroupsService.removeEmployeesFromGroup(employeeId, user, ip);
  }
}
