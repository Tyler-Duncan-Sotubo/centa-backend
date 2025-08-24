import { ConfigService } from '@nestjs/config';
interface GoalCheckinPayload {
    goalTitle: string;
    toEmail: string;
    subject: string;
    body: string;
    meta?: Record<string, any>;
}
export declare class GoalNotificationService {
    private readonly config;
    constructor(config: ConfigService);
    sendGoalCheckin(payload: GoalCheckinPayload): Promise<void>;
}
export {};
