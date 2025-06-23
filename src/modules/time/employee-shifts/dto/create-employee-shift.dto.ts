import { IsUUID, IsDateString } from 'class-validator';

export class CreateEmployeeShiftDto {
  @IsUUID()
  shiftId: string;

  @IsDateString()
  shiftDate: string;
}
