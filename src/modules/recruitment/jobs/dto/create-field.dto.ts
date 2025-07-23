import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';

export enum FieldType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  FILE = 'file',
  DATE = 'date',
  SELECT = 'select',
}

export class CreateFieldDto {
  @IsString()
  section: string;

  @IsString()
  label: string;

  @IsEnum(FieldType)
  fieldType: FieldType;

  @IsBoolean()
  @IsOptional()
  required?: boolean = false;

  @IsBoolean()
  @IsOptional()
  isVisible?: boolean = true;

  @IsBoolean()
  @IsOptional()
  isEditable?: boolean = true;

  @IsOptional()
  order?: number;
}
