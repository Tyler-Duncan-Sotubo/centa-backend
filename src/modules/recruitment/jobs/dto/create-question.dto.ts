import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';

export enum QuestionType {
  TEXT = 'text',
  SELECT = 'select',
  RADIO = 'radio',
  CHECKBOX = 'checkbox',
}

export class CreateQuestionDto {
  @IsString()
  question: string;

  @IsEnum(QuestionType)
  type: QuestionType;

  @IsBoolean()
  @IsOptional()
  required?: boolean = false;

  @IsOptional()
  order?: number;

  // Optional for select/radio/checkbox
  @IsOptional()
  @IsString({ each: true })
  options?: string[];
}
