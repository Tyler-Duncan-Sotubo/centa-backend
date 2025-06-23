import { IsUUID } from 'class-validator';
export class AssignParentDto {
  @IsUUID()
  parentDepartmentId: string;
}
