import { IsUUID } from 'class-validator';

export class AssignHeadDto {
  @IsUUID()
  headId: string;
}
