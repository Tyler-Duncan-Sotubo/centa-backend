import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { PayrollOverridesService } from './payroll-overrides.service';
import { CreatePayrollOverrideDto } from './dto/create-payroll-override.dto';
import { UpdatePayrollOverrideDto } from './dto/update-payroll-override.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';

@Controller('payroll-overrides')
export class PayrollOverridesController {
  constructor(
    private readonly payrollOverridesService: PayrollOverridesService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  create(
    @CurrentUser() user: User,
    @Body() createPayrollOverrideDto: CreatePayrollOverrideDto,
  ) {
    return this.payrollOverridesService.create(createPayrollOverrideDto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  findAll(@CurrentUser() user: User) {
    return this.payrollOverridesService.findAll(user.companyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.payrollOverridesService.findOne(id, user.companyId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  update(
    @Param('id') id: string,
    @Body() updatePayrollOverrideDto: UpdatePayrollOverrideDto,
    @CurrentUser() user: User,
  ) {
    return this.payrollOverridesService.update(
      id,
      updatePayrollOverrideDto,
      user,
    );
  }
}
