import { IsNotEmpty, IsString } from 'class-validator';

export class PasswordResetDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  token: string;
}
