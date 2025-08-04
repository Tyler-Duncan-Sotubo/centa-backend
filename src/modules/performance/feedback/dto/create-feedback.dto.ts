import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class CreateFeedbackDto {
  @IsUUID()
  recipientId: string;

  @IsEnum(['self', 'peer', 'manager_to_employee', 'employee_to_manager'])
  type: string;

  @IsBoolean()
  isAnonymous: boolean;

  @IsEnum(['private', 'managers', 'person_managers', 'team'])
  shareScope: string;

  @ValidateNested({ each: true })
  @Type(() => FeedbackAnswerDto)
  responses: FeedbackAnswerDto[];
}

class FeedbackAnswerDto {
  @IsUUID()
  questionId: string;

  @IsString()
  answer: string;
}
