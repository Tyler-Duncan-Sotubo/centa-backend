import { PartialType } from '@nestjs/mapped-types';
import { CreateRoleExpectationDto } from './create-role-expectation.dto';

export class UpdateRoleExpectationDto extends PartialType(
  CreateRoleExpectationDto,
) {}
