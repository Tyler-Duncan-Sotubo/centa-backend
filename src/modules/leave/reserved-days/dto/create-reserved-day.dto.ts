import { IsUUID, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateReservedDayDto {
  @IsUUID()
  employeeId: string;

  @IsUUID()
  leaveTypeId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
