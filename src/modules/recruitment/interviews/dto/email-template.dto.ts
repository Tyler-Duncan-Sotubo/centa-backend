import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateEmailTemplateDto {
  @IsString()
  name: string;

  @IsString()
  subject: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;
}

export class UpdateEmailTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;
}
