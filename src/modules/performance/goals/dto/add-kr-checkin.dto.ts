// src/modules/performance/dto/add-kr-checkin.dto.ts
import {
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsString,
  IsBoolean,
  MaxLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

/** Class-level rule: require either value OR progressPct */
@ValidatorConstraint({ name: 'CheckinValueOrPct', async: false })
export class CheckinValueOrPct implements ValidatorConstraintInterface {
  validate(obj: any) {
    const hasValue =
      obj?.value !== undefined && obj?.value !== null && obj?.value !== '';
    const hasPct =
      obj?.progressPct !== undefined &&
      obj?.progressPct !== null &&
      obj?.progressPct !== '';
    return hasValue || hasPct;
  }
  defaultMessage() {
    return 'Provide either "value" (for metric KRs) or "progressPct" (for milestone/binary KRs).';
  }
}

export class AddKrCheckinDto {
  @Validate(CheckinValueOrPct, {
    message:
      'Provide either "value" (for metric KRs) or "progressPct" (for milestone/binary KRs).',
  })
  dummyProperty?: any;
  /** For metric KRs: the latest measured value (e.g., 420.5, 32.5) */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false }, { message: 'value must be a number' })
  value?: number | null;

  /** For milestone/binary KRs OR manual input: 0..100 progress percentage */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'progressPct must be a number' })
  @Min(0)
  @Max(100)
  progressPct?: number | null;

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
