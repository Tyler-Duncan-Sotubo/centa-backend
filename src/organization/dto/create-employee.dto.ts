import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsNumber,
} from 'class-validator';

export enum EmploymentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class CreateEmployeeDto {
  // Personal Information
  @IsNumber()
  @IsNotEmpty()
  employee_number: number; // Assuming UUID for department

  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @IsNotEmpty()
  last_name: string;

  @IsString()
  @IsNotEmpty()
  job_title: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  phone: string;

  // Employment Information
  @IsEnum(EmploymentStatus)
  @IsNotEmpty()
  employment_status: EmploymentStatus;

  @IsString()
  @IsNotEmpty()
  start_date: string;

  // Association with User and Department
  @IsString()
  @IsOptional()
  department_id: string; // Assuming UUID for department reference

  // Active Status
  @IsBoolean()
  @IsOptional()
  is_active: boolean;

  // Compensation Information
  @IsNumber()
  @IsNumber()
  annual_gross: number;

  @IsNumber()
  @IsOptional()
  hourly_rate: number;

  @IsNumber()
  @IsOptional()
  bonus: number;

  @IsNumber()
  @IsOptional()
  commission: number;
}
