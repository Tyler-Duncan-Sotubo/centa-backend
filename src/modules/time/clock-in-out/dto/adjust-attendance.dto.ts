import {
  IsOptional,
  IsNotEmpty,
  IsString,
  IsDateString,
} from 'class-validator';

export class AdjustAttendanceDto {
  @IsOptional()
  @IsDateString()
  adjustedClockIn?: string; // Optional, ISO date-time string

  @IsOptional()
  @IsDateString()
  adjustedClockOut?: string; // Optional, ISO date-time string

  @IsString()
  @IsNotEmpty()
  reason: string; // Reason for adjustment
}
