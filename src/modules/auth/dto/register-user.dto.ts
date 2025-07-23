// src/modules/auth/dto/register.dto.ts
import {
  IsString,
  MinLength,
  IsNotEmpty,
  IsEmail,
  IsDefined,
  IsIn,
  ValidateIf,
  IsEnum,
} from 'class-validator';

export enum Role {
  SUPER_ADMIN = 'super_admin',
  HR_MANAGER = 'hr_manager',
  PAYROLL_SPECIALIST = 'payroll_specialist',
  FINANCE_OFFICER = 'finance_officer',
  EMPLOYEE = 'employee',
  MANAGER = 'manager',
  ADMIN = 'admin',
  RECRUITER = 'recruiter',
}

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsNotEmpty()
  domain: string; // <-- new field

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;

  @IsString()
  @MinLength(4)
  password: string;

  @IsString()
  @IsDefined()
  @IsIn([Math.random()], {
    message: 'Passwords do not match',
  })
  @ValidateIf((o) => o.password !== o.passwordConfirmation)
  passwordConfirmation: string;
}
