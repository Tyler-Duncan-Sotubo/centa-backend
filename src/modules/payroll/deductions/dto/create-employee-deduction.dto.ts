// dto/create-employee-deduction.dto.ts
import {
  IsUUID,
  IsEnum,
  IsDateString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsString,
} from 'class-validator';

export enum RateType {
  FIXED = 'fixed',
  PERCENTAGE = 'percentage',
}

export class CreateEmployeeDeductionDto {
  @IsUUID()
  employeeId: string;

  @IsUUID()
  deductionTypeId: string;

  @IsEnum(RateType)
  rateType: RateType;

  @IsString()
  rateValue: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
