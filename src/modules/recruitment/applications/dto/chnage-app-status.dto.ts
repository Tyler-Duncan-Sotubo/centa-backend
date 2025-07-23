import { IsUUID, IsOptional, IsString, IsIn } from 'class-validator';

export class ChangeApplicationStatusDto {
  @IsUUID()
  applicationId: string;

  @IsIn(['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'])
  newStatus:
    | 'applied'
    | 'screening'
    | 'interview'
    | 'offer'
    | 'hired'
    | 'rejected';

  @IsOptional()
  @IsString()
  notes?: string;
}
