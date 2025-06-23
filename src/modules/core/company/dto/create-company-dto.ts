import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  name: string;

  @IsString()
  domain: string;

  @IsString()
  country: string;

  @IsOptional()
  @IsEnum(['NGN', 'USD', 'EUR', 'GBP'])
  currency: string;

  @IsOptional()
  @IsString()
  timeZone: string;

  @IsOptional()
  @IsString()
  locale: string;

  @IsOptional()
  @IsString()
  primaryContactName: string;

  @IsOptional()
  @IsEmail()
  primaryContactEmail: string;

  @IsOptional()
  @IsString()
  primaryContactPhone: string;

  @IsOptional()
  @IsEnum(['free', 'pro', 'enterprise'])
  subscriptionPlan: string;

  @IsOptional()
  trialEndsAt: Date;
}
