import { PartialType } from '@nestjs/mapped-types';
import { CreatePayrollAdjustmentDto } from './create-payroll-adjustment.dto';

export class UpdatePayrollAdjustmentDto extends PartialType(CreatePayrollAdjustmentDto) {}
