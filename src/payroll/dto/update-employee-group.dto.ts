import { PartialType } from '@nestjs/mapped-types';
import { CreateEmployeeGroupDto } from './create-employee-group.dto';

export class UpdateEmployeeGroupDto extends PartialType(
  CreateEmployeeGroupDto,
) {}
