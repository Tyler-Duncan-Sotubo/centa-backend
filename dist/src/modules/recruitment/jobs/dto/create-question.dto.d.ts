export declare enum QuestionType {
    TEXT = "text",
    SELECT = "select",
    RADIO = "radio",
    CHECKBOX = "checkbox"
}
export declare class CreateQuestionDto {
    question: string;
    type: QuestionType;
    required?: boolean;
    order?: number;
    options?: string[];
}
