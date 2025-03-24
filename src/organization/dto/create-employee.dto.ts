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
  @IsString()
  @IsNotEmpty()
  employee_number: string; // Assuming UUID for department

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
  @IsOptional()
  employment_status: EmploymentStatus;

  @IsString()
  @IsNotEmpty()
  start_date: string;

  // Association with User and Department
  @IsString()
  @IsOptional()
  department_name: string; // Assuming UUID for department reference

  @IsString()
  @IsOptional()
  department_id: string; // Assuming UUID for department reference

  @IsString()
  @IsNotEmpty()
  group_name: string;

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

  @IsString()
  @IsNotEmpty()
  bank_name: string;

  @IsString()
  @IsNotEmpty()
  bank_account_number: string;

  @IsString()
  @IsNotEmpty()
  apply_nhf: string;

  @IsString()
  @IsOptional()
  tin: string;

  @IsString()
  @IsOptional()
  pension_pin: string;

  @IsString()
  @IsOptional()
  nhf_number: string;
}
