export declare class FeedbackScoreDto {
    criterionId: string;
    score: number;
    comment?: string;
}
export declare class SubmitFeedbackDto {
    scores: FeedbackScoreDto[];
}
