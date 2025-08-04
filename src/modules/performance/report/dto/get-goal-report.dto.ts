import {
  IsOptional,
  IsString,
  IsIn,
  IsNumber,
  Min,
  IsUUID,
} from 'class-validator';

export class GetGoalReportDto {
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
  @IsString()
  @IsIn(['draft', 'active', 'completed', 'published', 'archived'])
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumWeight?: number;
}
