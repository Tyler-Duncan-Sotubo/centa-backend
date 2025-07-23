import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { CreateFieldDto } from './create-field.dto';
import { CreateQuestionDto } from './create-question.dto';

export class ConfigDto {
  @IsIn(['resume_only', 'form_only', 'both'])
  style: 'resume_only' | 'form_only' | 'both';

  @IsOptional()
  @IsBoolean()
  includeReferences?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFieldDto)
  customFields?: CreateFieldDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  customQuestions?: CreateQuestionDto[];
}
