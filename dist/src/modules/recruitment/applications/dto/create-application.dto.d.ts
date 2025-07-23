export declare class FieldResponseDto {
    label: string;
    fieldType: string;
    value: string;
}
export declare class QuestionResponseDto {
    question: string;
    answer: string;
}
declare enum CandidateSource {
    CAREER_PAGE = "career_page",
    JOB_BOARD = "job_board",
    REFERRAL = "referral",
    AGENCY = "agency",
    HEADHUNTER = "headhunter",
    OTHER = "other"
}
export declare enum ApplicationSource {
    CAREER_PAGE = "career_page",
    LINKEDIN = "linkedin",
    INDEED = "indeed",
    REFERRAL = "referral",
    AGENCY = "agency",
    INTERNAL = "internal",
    OTHER = "other"
}
export declare class CreateApplicationDto {
    jobId: string;
    applicationSource: ApplicationSource;
    candidateSource: CandidateSource;
    fieldResponses: FieldResponseDto[];
    questionResponses: QuestionResponseDto[];
}
export {};
