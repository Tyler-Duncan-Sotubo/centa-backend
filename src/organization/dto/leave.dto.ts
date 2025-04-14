import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateLeaveDto {
  @IsString()
  @IsNotEmpty()
  leave_type: string;

  @IsInt()
  leave_entitlement: number;
}

export class CreateLeaveRequestDto {
  @IsString()
  @IsNotEmpty()
  leave_type: string;

  @IsDateString()
  @IsNotEmpty()
  start_date: string;

  @IsDateString()
  @IsNotEmpty()
  end_date: string;

  @IsString()
  @IsOptional()
  notes: string;

  @IsInt()
  @IsOptional()
  total_days_off: number;
}

export class UpdateLeaveDto extends PartialType(CreateLeaveDto) {}
export class UpdateLeaveRequestDto extends PartialType(CreateLeaveRequestDto) {}
