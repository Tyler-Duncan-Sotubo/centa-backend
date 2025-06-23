// src/modules/onboarding/dto/employee-onboarding-input.dto.ts
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsPhoneNumber,
  Length,
  IsUUID,
  IsNotEmpty,
  IsIn,
} from 'class-validator';
import { encrypt } from 'src/utils/crypto.util';
/* ────────────────────────────────   
     ENUMS (these mirror <select> options)
     ──────────────────────────────── */
export enum Gender {
  Male = 'male',
  Female = 'female',
  Other = 'other',
}

export enum MaritalStatus {
  Single = 'single',
  Married = 'married',
  Divorced = 'divorced',
  Widowed = 'widowed',
}

export enum Currency {
  NGN = 'NGN',
}

/* ────────────────────────────────
     DTO
     ──────────────────────────────── */
export class EmployeeOnboardingInputDto {
  /* ╔═══ PROFILE FIELDS ══════════════════════════════════╗ */

  @IsUUID()
  @IsNotEmpty()
  employeeId: string; // Unique identifier for the employee

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsPhoneNumber('NG', { message: 'Invalid Nigerian phone number' })
  phone?: string;

  @IsOptional()
  @IsString()
  emergencyName?: string;

  @IsOptional()
  @IsPhoneNumber('NG')
  emergencyPhone?: string;

  /* ╔═══ FINANCE FIELDS ══════════════════════════════════╗ */

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
  @Length(3, 3)
  @IsIn(['NGN', 'USD', 'EUR', 'GBP', 'KES', 'ZAR']) // extend as needed
  currency?: string = 'NGN';

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

  /* ╔═══ DOCUMENTS / UPLOADS ═════════════════════════════╗ */

  @IsOptional()
  idUpload?: string;

  // If you anticipate additional uploads, simply append more optional
  // fields here or use the generic `attachments` pattern discussed earlier.
}
