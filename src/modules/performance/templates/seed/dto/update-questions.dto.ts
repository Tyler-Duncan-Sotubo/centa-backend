import { PartialType } from '@nestjs/mapped-types';
import { CreateQuestionsDto } from './create-questions.dto';

export class UpdateQuestionsDto extends PartialType(CreateQuestionsDto) {}
