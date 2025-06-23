import {
  IsString,
  IsNotEmpty,
  IsArray,
  ArrayNotEmpty,
  IsEnum,
  IsInt,
  Min,
  IsOptional,
} from 'class-validator';

export enum WeekDay {
  Monday = 'monday',
  Tuesday = 'tuesday',
  Wednesday = 'wednesday',
  Thursday = 'thursday',
  Friday = 'friday',
  Saturday = 'saturday',
  Sunday = 'sunday',
}

export class CreateShiftDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  startTime: string; // format HH:mm

  @IsString()
  endTime: string; // format HH:mm

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(WeekDay, { each: true })
  workingDays: WeekDay[];

  @IsOptional()
  @IsInt()
  @Min(0)
  lateToleranceMinutes?: number;

  @IsOptional()
  allowEarlyClockIn?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  earlyClockInMinutes?: number;

  @IsOptional()
  allowLateClockOut?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  lateClockOutMinutes?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  locationId?: string; // Optional field for location ID
}
