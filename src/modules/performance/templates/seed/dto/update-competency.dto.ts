import { PartialType } from '@nestjs/mapped-types';
import { CreateCompetencyDto } from './create-competency.dto';

export class UpdateCompetencyDto extends PartialType(CreateCompetencyDto) {}
