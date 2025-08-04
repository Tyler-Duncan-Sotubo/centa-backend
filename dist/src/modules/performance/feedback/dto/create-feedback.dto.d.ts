export declare class CreateFeedbackDto {
    recipientId: string;
    type: string;
    isAnonymous: boolean;
    shareScope: string;
    responses: FeedbackAnswerDto[];
}
declare class FeedbackAnswerDto {
    questionId: string;
    answer: string;
}
export {};
