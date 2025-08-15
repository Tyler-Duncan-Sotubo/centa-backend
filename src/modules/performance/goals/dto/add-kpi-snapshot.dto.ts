import { IsNumber, IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';

export class AddKpiSnapshotDto {
  @IsUUID()
  childGoalId: string;

  @IsNumber()
  value!: number; // numeric or 0/1 for boolean KPIs

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsUrl()
  evidenceUrl?: string;
}
