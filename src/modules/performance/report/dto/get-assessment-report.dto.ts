// get-assessment-report.dto.ts
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class GetAssessmentReportDto {
  @IsOptional()
  @IsUUID()
  cycleId?: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsUUID()
  reviewerId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsString()
  status?: 'not_started' | 'in_progress' | 'submitted';
}
