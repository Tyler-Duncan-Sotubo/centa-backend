// src/modules/performance/dto/get-feedback-report.dto.ts
import { IsOptional, IsString, IsIn } from 'class-validator';

export class GetFeedbackReportDto {
  @IsOptional()
  @IsIn(['peer', 'self', 'manager_to_employee', 'all', 'employee_to_manager'])
  type: string;

  @IsOptional()
  @IsString()
  employeeId?: string;
}
