import { PartialType } from '@nestjs/mapped-types';
import { CreateOffboardingDto } from './create-offboarding.dto';

export class UpdateOffboardingDto extends PartialType(CreateOffboardingDto) {}
