import { PartialType } from '@nestjs/mapped-types';
import { CreateAppraisalDto } from './create-appraisal.dto';

export class UpdateAppraisalDto extends PartialType(CreateAppraisalDto) {}
