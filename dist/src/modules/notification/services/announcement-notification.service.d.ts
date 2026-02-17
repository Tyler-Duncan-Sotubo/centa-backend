import { ConfigService } from '@nestjs/config';
export interface AnnouncementPayload {
    toEmail: string;
    subject: string;
    firstName: string;
    title: string;
    body: string;
    publishedAt?: string;
    expiresAt?: string;
    companyName: string;
    meta?: Record<string, any>;
}
export interface AssessmentReminderPayload {
    toEmail: string;
    subject?: string;
    firstName: string;
    employeeName: string;
    reviewerName?: string;
    cycleName: string;
    dueDate?: string;
    companyName: string;
    meta?: Record<string, any>;
}
export declare class AnnouncementNotificationService {
    private readonly config;
    constructor(config: ConfigService);
    sendNewAnnouncement(payload: AnnouncementPayload): Promise<void>;
    sendAssessmentReminder(payload: AssessmentReminderPayload): Promise<void>;
}
