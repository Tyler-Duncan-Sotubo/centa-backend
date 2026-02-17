// dto/create-self-summary.dto.ts
import { IsString } from 'class-validator';

export class CreateSelfSummaryDto {
  @IsString()
  summary: string;
}
