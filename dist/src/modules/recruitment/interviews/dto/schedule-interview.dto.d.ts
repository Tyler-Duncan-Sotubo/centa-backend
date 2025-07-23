declare enum InterviewStage {
    PHONE_SCREEN = "phone_screen",
    TECHNICAL = "tech",
    ONSITE = "onsite",
    FINAL = "final"
}
export declare class ScheduleInterviewDto {
    applicationId: string;
    stage: InterviewStage;
    scheduledFor: string;
    durationMins: number;
    interviewerIds: string[];
    scorecardTemplateId: string;
    emailTemplateId?: string;
    meetingLink?: string;
    mode?: string;
    eventId?: string;
}
export {};
