import { IsOptional, IsString, IsNumber, Min, IsUUID } from 'class-validator';

export class GetAppraisalReportDto {
  @IsOptional()
  @IsUUID()
  cycleId?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumScore?: number;
}
