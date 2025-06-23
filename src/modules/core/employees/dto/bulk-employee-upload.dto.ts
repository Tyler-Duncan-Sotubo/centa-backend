import {
  IsString,
  IsUUID,
  IsEmail,
  IsOptional,
  IsEnum,
  Length,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { employeeStatus } from '../../schema';
import { CreateFinanceDto } from '../finance/dto/create-finance.dto';
import { CreateCompensationDto } from '../compensation/dto/create-compensation.dto';

/**
 * DTO for a single employee record combining core, finance, and compensation data
 */
export class BulkEmployeeDto {
  // Core employee fields
  @IsUUID()
  userId!: string;

  @IsString()
  @Length(1, 50)
  employeeNumber!: string;

  @IsOptional()
  departmentId?: string;

  @IsOptional()
  jobRoleId?: string;

  @IsOptional()
  payGroupId?: string;

  @IsOptional()
  costCenterId?: string;

  @IsEnum(employeeStatus)
  @IsOptional()
  employmentStatus?: keyof typeof employeeStatus;

  @IsString()
  @Length(1, 100)
  firstName!: string;

  @IsString()
  @Length(1, 100)
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsUUID()
  companyId!: string;

  // Nested finance and compensation
  @ValidateNested()
  @Type(() => CreateFinanceDto)
  finance!: CreateFinanceDto;

  @ValidateNested()
  @Type(() => CreateCompensationDto)
  compensation!: CreateCompensationDto;
}

/**
 * DTO for bulk upload of multiple employees
 */
export class BulkEmployeeUploadDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkEmployeeDto)
  employees!: BulkEmployeeDto[];
}
