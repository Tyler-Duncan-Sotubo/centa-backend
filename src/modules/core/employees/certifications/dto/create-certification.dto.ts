import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsUrl,
} from 'class-validator';

export class CreateCertificationDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsOptional() authority?: string;
  @IsString() @IsOptional() licenseNumber?: string;
  @IsDateString() @IsOptional() issueDate?: string;
  @IsDateString() @IsOptional() expiryDate?: string;
  @IsUrl() @IsOptional() documentUrl?: string;
}
