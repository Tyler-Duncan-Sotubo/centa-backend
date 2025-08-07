import { PartialType } from '@nestjs/mapped-types';
import { CreateOffboardingConfigDto } from './create-offboarding-config.dto';

export class UpdateOffboardingConfigDto extends PartialType(
  CreateOffboardingConfigDto,
) {}
