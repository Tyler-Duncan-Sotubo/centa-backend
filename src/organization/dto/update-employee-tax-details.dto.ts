import { PartialType } from '@nestjs/mapped-types';
import { CreateEmployeeTaxDetailsDto } from './create-employee-tax-details.dto';

export class UpdateEmployeeTaxDetailsDto extends PartialType(
  CreateEmployeeTaxDetailsDto,
) {}
