import { PartialType } from '@nestjs/mapped-types';
import { CreateOffboardingBeginDto } from './create-offboarding.dto';

export class UpdateOffboardingDto extends PartialType(
  CreateOffboardingBeginDto,
) {}
