export declare class CreateFeedbackQuestionDto {
    question: string;
    type: 'self' | 'peer' | 'manager_to_employee' | 'employee_to_manager';
    inputType: 'text' | 'rating' | 'yes_no' | 'dropdown' | 'checkbox';
    order: number;
}
