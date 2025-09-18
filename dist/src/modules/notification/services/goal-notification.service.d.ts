import { ConfigService } from '@nestjs/config';
interface GoalCheckinPayload {
    goalTitle: string;
    toEmail: string;
    subject: string;
    body: string;
    meta?: Record<string, any>;
}
interface GoalAssignmentPayload {
    toEmail: string;
    subject: string;
    assignedBy: string;
    assignedTo: string;
    title: string;
    dueDate: string;
    description: string;
    progress: string;
    meta?: Record<string, any>;
}
interface GoalUpdatePayload {
    toEmail: string;
    subject: string;
    firstName: string;
    addedBy: string;
    title: string;
    meta?: Record<string, any>;
}
export declare class GoalNotificationService {
    private readonly config;
    constructor(config: ConfigService);
    sendGoalCheckin(payload: GoalCheckinPayload): Promise<void>;
    sendGoalAssignment(payload: GoalAssignmentPayload): Promise<void>;
    sendGoalUpdates(payload: GoalUpdatePayload): Promise<void>;
}
export {};
