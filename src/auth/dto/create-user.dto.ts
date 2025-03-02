import {
  IsDefined,
  IsIn,
  IsString,
  MinLength,
  ValidateIf,
  IsNotEmpty,
  IsEmail,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  company_name: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsDefined()
  @MinLength(4)
  password: string;

  @IsString()
  @IsDefined()
  @IsIn([Math.random()], {
    message: 'Passwords do not match',
  })
  @ValidateIf((o) => o.password !== o.password_confirmation)
  password_confirmation: string;
}
