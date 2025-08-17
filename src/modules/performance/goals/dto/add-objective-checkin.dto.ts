// src/modules/performance/dto/add-objective-checkin.dto.ts
import {
  IsNumber,
  Min,
  Max,
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class AddObjectiveCheckinDto {
  /** Manual objective-level progress 0..100 */
  @Type(() => Number)
  @IsNumber({}, { message: 'progressPct must be a number' })
  @Min(0)
  @Max(100)
  progressPct!: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(2000)
  note?: string | null;

  /** If true, allow decreasing progress */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  allowRegression?: boolean;
}
