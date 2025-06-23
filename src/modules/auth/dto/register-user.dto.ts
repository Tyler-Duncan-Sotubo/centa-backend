// src/modules/auth/dto/register.dto.ts
import {
  IsString,
  MinLength,
  IsNotEmpty,
  IsEmail,
  IsDefined,
  IsIn,
  ValidateIf,
} from 'class-validator';

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
