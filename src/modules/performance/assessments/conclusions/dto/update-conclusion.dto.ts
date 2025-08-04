import { PartialType } from '@nestjs/mapped-types';
import { CreateConclusionDto } from './create-conclusion.dto';

export class UpdateConclusionDto extends PartialType(CreateConclusionDto) {}
