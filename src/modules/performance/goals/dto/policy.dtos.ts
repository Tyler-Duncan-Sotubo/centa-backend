// src/modules/performance/policy/policy.dtos.ts
import {
  IsOptional,
  IsIn,
  IsString,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

// Reusable enums (as literal arrays so TS narrows correctly)
export const VISIBILITY_VALUES = ['private', 'manager', 'company'] as const;
export type Visibility = (typeof VISIBILITY_VALUES)[number];

export const CADENCE_VALUES = ['weekly', 'biweekly', 'monthly'] as const;
export type Cadence = (typeof CADENCE_VALUES)[number];

export class UpsertCompanyPolicyDto {
  @IsOptional()
  @IsIn(VISIBILITY_VALUES, {
    message: `defaultVisibility must be one of: ${VISIBILITY_VALUES.join(', ')}`,
  })
  defaultVisibility?: Visibility;

  @IsOptional()
  @IsIn(CADENCE_VALUES, {
    message: `defaultCadence must be one of: ${CADENCE_VALUES.join(', ')}`,
  })
  defaultCadence?: Cadence;

  @IsOptional()
  @IsString()
  // If you want to validate IANA tz strictly, add a custom validator later.
  defaultTimezone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  defaultAnchorDow?: number; // 1..7 (Mon..Sun)

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  defaultAnchorHour?: number; // 0..23
}

export class UpsertTeamPolicyDto {
  @IsOptional()
  @IsIn(VISIBILITY_VALUES, {
    message: `visibility must be one of: ${VISIBILITY_VALUES.join(', ')}`,
  })
  visibility?: Visibility;

  @IsOptional()
  @IsIn(CADENCE_VALUES, {
    message: `cadence must be one of: ${CADENCE_VALUES.join(', ')}`,
  })
  cadence?: Cadence;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  anchorDow?: number; // 1..7

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  anchorHour?: number; // 0..23

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  defaultOwnerIsLead?: boolean;
}
