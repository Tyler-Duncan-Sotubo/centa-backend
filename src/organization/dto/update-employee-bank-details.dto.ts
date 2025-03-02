import { PartialType } from '@nestjs/mapped-types';
import { CreateEmployeeBankDetailsDto } from './create-employee-bank-details.dto';

export class UpdateEmployeeBankDetailsDto extends PartialType(
  CreateEmployeeBankDetailsDto,
) {}
