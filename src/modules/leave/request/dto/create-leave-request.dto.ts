import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateLeaveRequestDto {
  @IsUUID()
  leaveTypeId: string;

  @IsUUID()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsNotEmpty()
  endDate: string;

  @IsString()
  @IsNotEmpty()
  reason?: string;

  @IsOptional()
  @IsString()
  partialDay: 'AM' | 'PM';
}
