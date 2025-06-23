import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class BulkCreateLeavePolicyDto {
  @IsOptional()
  @IsString()
  leaveTypeId: string;

  @IsBoolean()
  @IsOptional()
  accrualEnabled?: boolean;

  @IsOptional()
  @IsString()
  accrualFrequency?: 'monthly' | 'quarterly' | 'annually';

  @IsOptional()
  @IsString()
  accrualAmount?: string;

  @IsOptional()
  @IsNumber()
  maxBalance?: number;

  @IsBoolean()
  @IsOptional()
  allowCarryover?: boolean;

  @IsOptional()
  @IsNumber()
  carryoverLimit?: number;

  @IsBoolean()
  @IsOptional()
  onlyConfirmedEmployees?: boolean;

  @IsOptional()
  eligibilityRules?: Record<string, any>;

  @IsOptional()
  @IsString()
  genderEligibility?: 'male' | 'female' | 'any';

  @IsOptional()
  @IsString()
  leaveNature?: 'paid' | 'unpaid' | 'mandatory' | 'optional' | 'statutory';

  @IsBoolean()
  @IsOptional()
  isSplittable?: boolean;
}
