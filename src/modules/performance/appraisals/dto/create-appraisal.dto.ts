import {
  IsUUID,
  IsOptional,
  IsEnum,
  IsInt,
  Max,
  Min,
  IsString,
} from 'class-validator';

export class CreateAppraisalDto {
  @IsUUID()
  cycleId: string;

  @IsUUID()
  employeeId: string;

  @IsOptional()
  @IsEnum(['promote', 'hold', 'exit'])
  promotionRecommendation?: 'promote' | 'hold' | 'exit';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  finalScore?: number;

  @IsOptional()
  @IsString()
  finalNote?: string;
}
