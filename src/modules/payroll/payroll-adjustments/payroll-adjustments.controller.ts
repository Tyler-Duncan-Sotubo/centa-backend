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
} from '@nestjs/common';
import { PayrollAdjustmentsService } from './payroll-adjustments.service';
import { CreatePayrollAdjustmentDto } from './dto/create-payroll-adjustment.dto';
import { UpdatePayrollAdjustmentDto } from './dto/update-payroll-adjustment.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';

@Controller('payroll-adjustments')
export class PayrollAdjustmentsController {
  constructor(
    private readonly payrollAdjustmentsService: PayrollAdjustmentsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.adjustments.manage'])
  create(
    @Body() createPayrollAdjustmentDto: CreatePayrollAdjustmentDto,
    @CurrentUser() user: User,
  ) {
    return this.payrollAdjustmentsService.create(
      createPayrollAdjustmentDto,
      user,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.adjustments.read'])
  findAll(@CurrentUser() user: User) {
    return this.payrollAdjustmentsService.findAll(user.companyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.adjustments.read'])
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.payrollAdjustmentsService.findOne(id, user.companyId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.adjustments.manage'])
  update(
    @Param('id') id: string,
    @Body() updatePayrollAdjustmentDto: UpdatePayrollAdjustmentDto,
    @CurrentUser() user: User,
  ) {
    return this.payrollAdjustmentsService.update(
      id,
      updatePayrollAdjustmentDto,
      user,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.adjustments.manage'])
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.payrollAdjustmentsService.remove(id, user);
  }
}
