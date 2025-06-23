import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  Min,
  Length,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { encrypt } from 'src/utils/crypto.util';

export class CreateEmployeeMultiDetailsDto {
  // Core Identifiers
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  companyRoleId: string;

  @IsOptional()
  role: string;

  @IsString()
  @IsNotEmpty()
  employeeNumber: string;

  // Work
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
  @IsOptional()
  costCenterId: string;

  @IsEnum(['probation', 'active', 'on_leave', 'resigned', 'terminated'])
  employmentStatus: string;

  @IsDateString()
  employmentStartDate: string;

  // @IsDateString()
  // @IsOptional()
  // employmentEndDate?: string;

  @IsOptional()
  @IsDateString()
  probationEndDate?: string;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  confirmed: boolean;

  // Personal
  @IsDateString()
  dateOfBirth: string;

  @IsString()
  phone: string;

  @IsEnum(['male', 'female', 'other'])
  gender: string;

  @IsEnum(['single', 'married', 'divorced'])
  maritalStatus: string;

  @IsString()
  address: string;

  @IsString()
  state: string;

  @IsString()
  country: string;

  @IsString()
  emergencyName: string;

  @IsString()
  emergencyPhone: string;

  // Financial
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  grossSalary: number;

  @IsString()
  @Length(3, 3)
  currency: string;

  @IsNotEmpty()
  @IsIn(['Monthly', 'Biweekly', 'Weekly'])
  payFrequency!: 'Monthly' | 'Biweekly' | 'Weekly';

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  applyNHf: boolean;

  // Dependent (single)
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  relationship: string;

  @IsOptional()
  @IsDateString()
  dependentDob: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isBeneficiary: boolean;

  @IsOptional()
  @IsString()
  @Transform(({ obj }) => String(obj.employmentDate))
  effectiveDate: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value != null ? encrypt(value) : value), {
    toClassOnly: true,
  })
  bankName?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value != null ? encrypt(value) : value), {
    toClassOnly: true,
  })
  bankAccountNumber?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value != null ? encrypt(value) : value), {
    toClassOnly: true,
  })
  bankBranch?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value != null ? encrypt(value) : value), {
    toClassOnly: true,
  })
  bankAccountName?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value != null ? encrypt(value) : value), {
    toClassOnly: true,
  })
  tin?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value != null ? encrypt(value) : value), {
    toClassOnly: true,
  })
  pensionPin?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value != null ? encrypt(value) : value), {
    toClassOnly: true,
  })
  nhfNumber?: string;
}
