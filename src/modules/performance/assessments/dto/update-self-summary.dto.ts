// dto/update-self-summary.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateSelfSummaryDto } from './create-self-summary.dto';

export class UpdateSelfSummaryDto extends PartialType(CreateSelfSummaryDto) {}
