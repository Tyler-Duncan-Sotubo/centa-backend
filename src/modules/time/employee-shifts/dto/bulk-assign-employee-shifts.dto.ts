import { IsDateString, IsUUID } from 'class-validator';

export class BulkCreateEmployeeShiftDto {
  @IsUUID()
  employeeId: string;

  @IsUUID()
  shiftId: string;

  @IsDateString()
  shiftDate: string;
}
