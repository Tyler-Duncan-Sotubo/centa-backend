import { Type } from 'class-transformer';
import {
  IsUUID,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  ArrayNotEmpty,
  ValidateNested,
} from 'class-validator';

export class FeedbackScoreDto {
  @IsUUID()
  criterionId: string;

  @IsNumber()
  @Min(0)
  @Max(5) // or adjust based on your max score
  score: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class SubmitFeedbackDto {
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => FeedbackScoreDto)
  scores: FeedbackScoreDto[];
}
