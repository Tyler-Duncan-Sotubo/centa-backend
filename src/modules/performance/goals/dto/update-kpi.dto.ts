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
import { Dir } from './create-kpi.dto';

export class UpdateKpiDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(['up', 'down', 'range', 'boolean'])
  direction?: Dir;

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
  weight?: number;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsNumber()
  current?: number | null;
}
