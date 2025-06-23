import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export enum FieldTag {
  PROFILE = 'profile',
  FINANCE = 'finance',
  EDUCATION = 'education',
  DEPENDENTS = 'dependents',
  DOCUMENT = 'document',
  OTHER = 'other',
}

export class OnboardingTemplateChecklistDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsIn(['employee', 'hr'])
  assignee: 'employee' | 'hr';

  @IsNumber()
  @IsOptional()
  dueDaysAfterStart?: number;

  @IsNumber()
  @IsOptional()
  order?: number;
}

export class OnboardingTemplateFieldDto {
  @IsString()
  @IsNotEmpty()
  fieldKey: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsNotEmpty()
  fieldType: string; // e.g. 'text', 'select', 'file'

  @IsBoolean()
  @IsNotEmpty()
  required: boolean;

  @IsNumber()
  @IsNotEmpty()
  order: number;

  @IsString()
  @IsNotEmpty()
  @IsIn(Object.values(FieldTag))
  tag: string;
}

export class CreateOnboardingTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  description: string;

  @IsArray()
  fields: OnboardingTemplateFieldDto[];

  @IsArray()
  checklist: OnboardingTemplateChecklistDto[];
}
