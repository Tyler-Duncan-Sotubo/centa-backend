import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsIn,
} from 'class-validator';

export class CreateQuestionsDto {
  @IsNotEmpty()
  @IsString()
  question: string;

  @IsIn(['text', 'dropdown', 'rating', 'yes_no'])
  type: string;

  @IsOptional()
  @IsUUID()
  competencyId?: string;

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @IsOptional()
  @IsBoolean()
  allowNotes?: boolean;
}
