import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export type Dir = 'up' | 'down' | 'range' | 'boolean';

export class CreateKpiDto {
  @IsString()
  name!: string; // e.g., "MTTR (hours)"

  @IsEnum(['up', 'down', 'range', 'boolean'])
  direction!: Dir;

  @IsOptional()
  @IsEnum(['percent', 'currency', 'count', 'number', 'boolean'])
  unit?: 'percent' | 'currency' | 'count' | 'number' | 'boolean';

  @IsOptional()
  @IsNumber()
  baseline?: number | null;

  @IsOptional()
  @IsNumber()
  target?: number | null;

  @IsOptional()
  @IsNumber()
  targetMin?: number | null;

  @IsOptional()
  @IsNumber()
  targetMax?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  weight?: number; // 0–100%

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsDateString()
  targetDate?: string; // YYYY-MM-DD
}
