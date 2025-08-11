type QuestionSeed = {
    competency: string;
    questions: {
        question: string;
        type: 'text' | 'dropdown' | 'rating' | 'yes_no';
        isMandatory?: boolean;
        allowNotes?: boolean;
    }[];
};
export declare const competencies: {
    name: string;
    description: string;
}[];
export declare const questions: QuestionSeed[];
export {};
