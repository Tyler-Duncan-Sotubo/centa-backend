// dtos/work-hours.dto.ts
import {
  IsString,
  IsArray,
  IsNotEmpty,
  IsNumber,
  ArrayNotEmpty,
  IsIn,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class WorkHoursDTO {
  @IsString()
  @IsNotEmpty()
  startTime: string; // Format: "HH:mm"

  @IsString()
  @IsNotEmpty()
  endTime: string; // Format: "HH:mm"

  @IsNumber()
  breakMinutes: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], {
    each: true,
  })
  workDays: string[];
}

export class AttendanceRulesDTO {
  @IsOptional()
  @IsNumber()
  gracePeriodMins: number;

  @IsOptional()
  @IsBoolean()
  applyToPayroll: boolean;

  @IsOptional()
  @IsNumber()
  penaltyAfterMins: number;

  @IsOptional()
  @IsNumber()
  penaltyAmount: number;

  @IsOptional()
  @IsNumber()
  earlyLeaveThresholdMins: number;

  @IsOptional()
  @IsNumber()
  absenceThresholdHours: number;

  @IsOptional()
  @IsBoolean()
  countWeekends: boolean;
}
