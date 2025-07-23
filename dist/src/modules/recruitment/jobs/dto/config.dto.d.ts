import { CreateFieldDto } from './create-field.dto';
import { CreateQuestionDto } from './create-question.dto';
export declare class ConfigDto {
    style: 'resume_only' | 'form_only' | 'both';
    includeReferences?: boolean;
    customFields?: CreateFieldDto[];
    customQuestions?: CreateQuestionDto[];
}
