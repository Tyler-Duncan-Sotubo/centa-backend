import { PartialType } from '@nestjs/mapped-types';
import { CreateBenefitGroupDto } from './create-benefit-group.dto';

export class UpdateBenefitGroupDto extends PartialType(CreateBenefitGroupDto) {}
