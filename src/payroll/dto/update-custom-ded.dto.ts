import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomDeduction } from './create-custom-ded.dto';

export class UpdateCustomDeductionDto extends PartialType(
  CreateCustomDeduction,
) {}
