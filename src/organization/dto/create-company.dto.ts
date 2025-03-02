import { IsString, IsOptional, MaxLength, IsEnum } from 'class-validator';

export enum PayFrequency {
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
}

export class CreateCompanyDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  country: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  postal_code?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  registration_number?: string;

  @IsOptional()
  @IsString()
  logo_url: string;

  @IsOptional()
  @IsEnum(PayFrequency)
  pay_frequency?: PayFrequency;

  @IsOptional()
  @IsString()
  time_zone?: string;

  @IsOptional()
  @IsString()
  phone_number?: string;

  @IsOptional()
  @IsString()
  email?: string;
}
