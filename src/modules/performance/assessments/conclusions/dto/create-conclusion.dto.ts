import {
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  MaxLength,
} from 'class-validator';

export class CreateConclusionDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string;

  @IsOptional()
  @IsString()
  strengths?: string;

  @IsOptional()
  @IsString()
  areasForImprovement?: string;

  @IsOptional()
  @IsInt()
  finalScore?: number;

  @IsOptional()
  @IsString()
  promotionRecommendation?: string;

  @IsOptional()
  @IsBoolean()
  potentialFlag?: boolean;
}
