import { db } from 'src/drizzle/types/drizzle';
import { Queue } from 'bullmq';
type CreateNotificationEventInput = {
    companyId: string;
    channel?: 'email' | 'in_app';
    eventType: string;
    entityType?: 'goal' | 'assessment' | 'cycle' | 'announcement' | 'other';
    entityId?: string | null;
    recipientUserId?: string | null;
    recipientEmployeeId?: string | null;
    recipientEmail?: string | null;
    dedupeKey: string;
    payload?: any;
    jobName: 'sendNotificationEvent';
};
export declare class NotificationEngineService {
    private readonly db;
    private readonly emailQueue;
    private readonly logger;
    constructor(db: db, emailQueue: Queue);
    createAndEnqueue(input: CreateNotificationEventInput): Promise<{
        id: string;
        dedupeKey: string;
    } | null>;
    markSent(eventId: string): Promise<void>;
    markFailed(eventId: string, error: any): Promise<void>;
}
export {};
