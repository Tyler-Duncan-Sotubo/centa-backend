// src/modules/performance/dto/get-dashboard-assessments.dto.ts
import { IsOptional, IsUUID, IsIn, IsString } from 'class-validator';

export class GetDashboardAssessmentsDto {
  @IsOptional()
  @IsIn(['not_started', 'in_progress', 'submitted', 'archived', 'all'])
  status?: string;

  @IsOptional()
  @IsIn(['self', 'manager', 'peer', 'all'])
  type?: string;

  @IsOptional()
  @IsUUID()
  cycleId?: string;

  @IsOptional()
  @IsUUID()
  reviewerId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
