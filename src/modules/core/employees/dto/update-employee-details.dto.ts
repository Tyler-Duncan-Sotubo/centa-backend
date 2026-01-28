import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsDateString,
} from 'class-validator';

export enum EmploymentStatus {
  PROBATION = 'probation',
  ACTIVE = 'active',
  ON_LEAVE = 'on_leave',
  RESIGNED = 'resigned',
  TERMINATED = 'terminated',
}

export class EmployeeProfileDto {
  @IsString()
  @IsNotEmpty()
  employeeNumber: string;

  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @IsString()
  @IsNotEmpty()
  locationId: string;

  @IsString()
  @IsNotEmpty()
  payGroupId: string;

  @IsString()
  @IsNotEmpty()
  jobRoleId: string;

  @IsString()
  @IsNotEmpty()
  companyRoleId: string;

  @IsString()
  @IsOptional()
  costCenterId?: string | null;

  @IsEnum(EmploymentStatus)
  employmentStatus: EmploymentStatus;

  @IsDateString()
  employmentStartDate: string;

  @IsOptional()
  @IsDateString()
  employmentEndDate?: string;

  @IsBoolean()
  confirmed: boolean;
}
