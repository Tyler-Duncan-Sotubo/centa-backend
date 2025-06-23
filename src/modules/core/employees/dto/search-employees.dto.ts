// src/modules/core/employees/dto/search-employees.dto.ts
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

const STATUSES = [
  'probation',
  'active',
  'on_leave',
  'resigned',
  'terminated',
] as const;

export class SearchEmployeesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  jobRoleId?: string;

  @IsOptional()
  @IsUUID()
  costCenterId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsString()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];
}
