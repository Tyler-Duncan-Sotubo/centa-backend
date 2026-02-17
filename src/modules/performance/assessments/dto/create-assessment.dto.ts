import { IsUUID, IsIn, IsOptional } from 'class-validator';

export class CreateAssessmentDto {
  @IsUUID()
  cycleId: string;

  @IsOptional()
  @IsUUID()
  templateId?: string; // optional because you default it

  @IsUUID()
  revieweeId: string;

  @IsIn(['self', 'manager', 'peer'])
  type: 'self' | 'manager' | 'peer';
}
