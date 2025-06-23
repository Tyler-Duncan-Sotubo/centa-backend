import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsDateString,
  IsNumber,
  Min,
  IsBoolean,
} from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @IsOptional()
  employeeNumber?: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  /** Optional contact phone */
  @IsString()
  @IsOptional()
  phone?: string;

  /** Date the employee starts */
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  /** Optional payroll seeds */
  @IsNumber()
  @Min(0)
  @IsOptional()
  annualGross?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  bonus?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  commission?: number;

  @IsBoolean()
  @IsOptional()
  applyNhf?: boolean;

  /** Lookup fields by name/code */
  @IsString()
  @IsNotEmpty()
  jobRole: string;

  @IsString()
  @IsNotEmpty()
  department: string;

  @IsString()
  @IsOptional()
  costCenter?: string;
}
