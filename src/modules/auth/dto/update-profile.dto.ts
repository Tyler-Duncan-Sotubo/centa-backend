import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class UpdateProfileDto {
  @IsEmail()
  @IsOptional()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  first_name: string;

  @IsString()
  @IsOptional()
  last_name: string;

  @IsString()
  @IsOptional()
  avatar: string;
}
