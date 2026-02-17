import { ConfigService } from '@nestjs/config';
export interface GoalCheckinPayload {
    toEmail: string;
    firstName: string;
    employeeName: string;
    subject: string;
    title: string;
    dueDate?: string;
    body?: string;
    companyName?: string;
    meta?: {
        goalId?: string;
        employeeId?: string;
        bucket?: 't7' | 't2' | 'today' | 'overdue' | string;
        [k: string]: any;
    };
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
interface GoalApprovalRequestPayload {
    toEmail: string;
    subject: string;
    employeeName: string;
    managerName: string;
    title: string;
    dueDate: string;
    description: string;
    meta?: Record<string, any>;
}
export declare class GoalNotificationService {
    private readonly config;
    constructor(config: ConfigService);
    sendGoalCheckin(payload: GoalCheckinPayload): Promise<void>;
    sendGoalAssignment(payload: GoalAssignmentPayload): Promise<void>;
    sendGoalUpdates(payload: GoalUpdatePayload): Promise<void>;
    sendGoalApprovalRequest(payload: GoalApprovalRequestPayload): Promise<void>;
}
export {};
