import { IsOptional, IsString, IsEnum, IsEmail } from 'class-validator';

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsEnum(['NGN', 'USD', 'EUR', 'GBP'])
  currency?: string;

  @IsOptional()
  @IsString()
  primaryContactName?: string;

  @IsOptional()
  @IsEmail()
  primaryContactEmail?: string;

  @IsOptional()
  @IsString()
  primaryContactPhone?: string;

  @IsOptional()
  @IsString()
  regNo?: string;

  @IsOptional()
  @IsString()
  logo_url?: string;

  @IsOptional()
  @IsEnum(['free', 'pro', 'enterprise'])
  subscriptionPlan?: string;

  @IsOptional()
  trialEndsAt?: Date;
}
