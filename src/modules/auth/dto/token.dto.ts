import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class TokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Activation Token is required.' })
  token: string;
}

export class RequestPasswordResetDto {
  @IsString()
  @IsEmail()
  @IsNotEmpty({ message: 'Email is required.' })
  @Transform(({ value }) => value.trim().toLowerCase())
  email: string;
}

export class VerifyLoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Temporary Token is required.' })
  tempToken: string;

  @IsString()
  @IsNotEmpty({ message: 'Verification Code is required.' })
  code: string;
}
