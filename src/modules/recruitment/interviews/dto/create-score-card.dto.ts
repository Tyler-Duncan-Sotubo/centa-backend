import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateScorecardCriterionDto {
  @IsString()
  label: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  maxScore: number;
}

export class CreateScorecardTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateScorecardCriterionDto)
  criteria: CreateScorecardCriterionDto[];
}
