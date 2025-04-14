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
