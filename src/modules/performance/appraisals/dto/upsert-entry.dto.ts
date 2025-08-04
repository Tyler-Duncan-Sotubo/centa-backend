import { IsUUID, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class UpsertEntryDto {
  @IsUUID()
  @IsNotEmpty()
  appraisalId: string;

  @IsUUID()
  @IsNotEmpty()
  competencyId: string;

  @IsUUID()
  @IsOptional()
  expectedLevelId: string;

  @IsUUID()
  @IsOptional()
  employeeLevelId?: string;

  @IsUUID()
  @IsOptional()
  managerLevelId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
