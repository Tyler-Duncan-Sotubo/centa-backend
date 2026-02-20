import { IsUUID } from 'class-validator';

export class AssignLocationDto {
  @IsUUID()
  locationId: string;

  @IsUUID()
  employeeId: string;
}
