import { IsOptional, IsString } from 'class-validator';

export class CreateProfileDto {
  @IsString() dateOfBirth?: string;
  @IsString() @IsOptional() gender?: string;
  @IsString() @IsOptional() maritalStatus?: string;
  @IsString() @IsOptional() address?: string;
  @IsString() @IsOptional() emergencyName?: string;
  @IsString() @IsOptional() emergencyPhone?: string;
  @IsString() @IsOptional() state?: string;
  @IsString() @IsOptional() country?: string;
  @IsString() @IsOptional() phone?: string;
}
