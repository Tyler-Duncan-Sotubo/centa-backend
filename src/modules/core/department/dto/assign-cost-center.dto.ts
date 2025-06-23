import { IsUUID } from 'class-validator';
export class AssignCostCenterDto {
  @IsUUID()
  costCenterId: string;
}
