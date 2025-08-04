import { IsIn, IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateFeedbackQuestionDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsIn(['self', 'peer', 'manager_to_employee', 'employee_to_manager'])
  type: 'self' | 'peer' | 'manager_to_employee' | 'employee_to_manager';

  @IsIn(['text', 'rating', 'yes_no', 'dropdown', 'checkbox'])
  inputType: 'text' | 'rating' | 'yes_no' | 'dropdown' | 'checkbox';

  @IsInt()
  order: number;
}
