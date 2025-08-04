// dto/get-top-employees.dto.ts
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class GetTopEmployeesDto {
  @IsEnum(['appraisal', 'performance'])
  @IsOptional()
  cycleType: 'appraisal' | 'performance' = 'appraisal';

  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @IsUUID()
  @IsOptional()
  jobRoleId?: string;
}
