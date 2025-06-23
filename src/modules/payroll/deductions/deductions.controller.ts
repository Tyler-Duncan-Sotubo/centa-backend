import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { DeductionsService } from './deductions.service';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CreateDeductionTypeDto } from './dto/create-deduction-type.dto';
import { CreateEmployeeDeductionDto } from './dto/create-employee-deduction.dto';

@Controller('deductions')
export class DeductionsController extends BaseController {
  constructor(private readonly deductionsService: DeductionsService) {
    super();
  }

  // Deduction Types

  @Post('types')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.deductions.types.manage'])
  createDeductionType(
    @Body() createDeductionTypeDto: CreateDeductionTypeDto,
    @CurrentUser() user: User,
  ) {
    return this.deductionsService.createDeductionType(
      user,
      createDeductionTypeDto,
    );
  }

  @Get('types')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.deductions.types.read'])
  findAllDeductionTypes() {
    return this.deductionsService.getDeductionTypes();
  }

  @Patch('types/:deductionTypeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.deductions.types.manage'])
  updateDeductionType(
    @CurrentUser() user: User,
    @Param('deductionTypeId') deductionTypeId: string,
    @Body() updateDeductionTypeDto: CreateDeductionTypeDto,
  ) {
    return this.deductionsService.updateDeductionType(
      user,
      updateDeductionTypeDto,
      deductionTypeId,
    );
  }

  @Delete('types/:deductionTypeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.deductions.types.manage'])
  removeDeductionType(
    @Param('deductionTypeId') deductionTypeId: string,
    @CurrentUser() user: User,
  ) {
    return this.deductionsService.deleteDeductionType(deductionTypeId, user.id);
  }

  // Employee deductions

  @Post('employee-deductions')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.deductions.employee.manage'])
  assignDeductionToEmployee(
    @Body() dto: CreateEmployeeDeductionDto,
    @CurrentUser() user: User,
  ) {
    return this.deductionsService.assignDeductionToEmployee(user, dto);
  }

  @Get('company/employee-deductions')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.deductions.employee.read'])
  getAllEmployeeDeductionsForCompany(@CurrentUser() user: User) {
    return this.deductionsService.getAllEmployeeDeductionsForCompany(
      user.companyId,
    );
  }

  @Get('employee-deductions/:employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.deductions.employee.read'])
  getEmployeeDeductions(@Param('employeeId') employeeId: string) {
    return this.deductionsService.getEmployeeDeductions(employeeId);
  }

  @Patch('employee-deductions/:employeeDeductionId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.deductions.employee.manage'])
  updateEmployeeDeduction(
    @Param('employeeDeductionId') employeeDeductionId: string,
    @Body() dto: CreateEmployeeDeductionDto,
    @CurrentUser() user: User,
  ) {
    return this.deductionsService.updateEmployeeDeduction(
      user,
      employeeDeductionId,
      dto,
    );
  }

  @Delete('employee-deductions/:employeeDeductionId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.deductions.employee.manage'])
  removeEmployeeDeduction(
    @Param('employeeDeductionId') employeeDeductionId: string,
    @CurrentUser() user: User,
  ) {
    return this.deductionsService.removeEmployeeDeduction(
      employeeDeductionId,
      user.id,
    );
  }
}
