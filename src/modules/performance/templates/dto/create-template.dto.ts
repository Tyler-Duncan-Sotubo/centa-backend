import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  includeGoals?: boolean;

  @IsOptional()
  @IsBoolean()
  includeAttendance?: boolean;

  @IsOptional()
  @IsBoolean()
  includeFeedback?: boolean;

  @IsOptional()
  @IsBoolean()
  includeQuestionnaire?: boolean;

  @IsOptional()
  @IsBoolean()
  requireSignature?: boolean;

  @IsOptional()
  @IsBoolean()
  restrictVisibility?: boolean;
}
