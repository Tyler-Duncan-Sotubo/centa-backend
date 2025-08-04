import { IsUUID, IsIn } from 'class-validator';

export class CreateAssessmentDto {
  @IsUUID()
  cycleId: string;

  @IsUUID()
  templateId: string;

  @IsUUID()
  revieweeId: string;

  @IsIn(['self', 'manager', 'peer'])
  type: 'self' | 'manager' | 'peer';
}
