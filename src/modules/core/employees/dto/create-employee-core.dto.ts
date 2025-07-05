import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEmail,
  IsNumber,
} from 'class-validator';

export class CreateEmployeeCoreDto {
  /** Optional: if omitted, auto-generate (“HR01”, “HR02”, …) */
  @IsOptional()
  @IsString()
  employeeNumber: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  jobRoleId?: string;

  @IsString()
  @IsOptional()
  departmentId: string;

  @IsString()
  @IsOptional()
  payGroupId: string;

  @IsString()
  @IsOptional()
  costCenterId: string;

  @IsString()
  @IsOptional()
  employmentStatus: string;

  @IsString()
  @IsOptional()
  locationId: string;

  @IsString()
  employmentStartDate: string;

  @IsOptional()
  companyRoleId: string;

  @IsOptional()
  role: string;

  @IsOptional()
  @IsString()
  onboardingTemplateId?: string;

  @IsOptional()
  @Type(() => Number) // ← coerce to number
  @IsNumber({ maxDecimalPlaces: 2 })
  grossSalary!: number;
}
