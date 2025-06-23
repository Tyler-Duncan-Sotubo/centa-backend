import {
  IsString,
  IsNotEmpty,
  IsDefined,
  MinLength,
  IsIn,
  ValidateIf,
} from 'class-validator';

export class UserEmailDto {
  @IsString()
  @IsNotEmpty()
  email: string;
}

export class PasswordResetDto {
  @IsString()
  @IsDefined()
  @MinLength(4)
  password: string;

  @IsString()
  @IsDefined()
  @IsIn([Math.random()], {
    message: 'Passwords do not match',
  })
  @ValidateIf((o) => o.password !== o.passwordConfirmation)
  passwordConfirmation: string;

  @IsString()
  @IsNotEmpty()
  token: string;
}
