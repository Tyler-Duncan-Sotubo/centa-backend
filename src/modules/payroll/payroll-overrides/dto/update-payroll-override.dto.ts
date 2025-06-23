import { PartialType } from '@nestjs/mapped-types';
import { CreatePayrollOverrideDto } from './create-payroll-override.dto';

export class UpdatePayrollOverrideDto extends PartialType(CreatePayrollOverrideDto) {}
