import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class TokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Activation Token is required.' })
  token: string;
}

export class RequestPasswordResetDto {
  @IsString()
  @IsEmail()
  @IsNotEmpty({ message: 'Email is required.' })
  email: string;
}
