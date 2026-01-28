import { ConfigService } from '@nestjs/config';
type LeaveStatus = 'pending' | 'approved' | 'rejected';
export interface LeaveStatusEmailPayload {
    toEmail: string;
    managerName: string;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    totalDays: string;
    reason?: string;
    companyName: string;
    status: LeaveStatus;
    rejectionReason?: string;
    actionUrl?: string;
    leaveRequestId?: string;
    employeeId?: string;
    approverId?: string;
    meta?: Record<string, any>;
}
export declare class LeaveNotificationService {
    private readonly config;
    constructor(config: ConfigService);
    private readonly logoUrl;
    private ensureSendGrid;
    private buildSubject;
    private buildStatusTitle;
    private buildStatusMessage;
    private buildActionUrl;
    private pickTemplateId;
    sendLeaveEmail(payload: LeaveStatusEmailPayload): Promise<void>;
    sendLeaveApprovalRequestEmail(payload: Omit<LeaveStatusEmailPayload, 'status'>): Promise<void>;
    sendLeaveDecisionEmail(payload: Omit<LeaveStatusEmailPayload, 'status'> & {
        status: 'approved' | 'rejected';
    }): Promise<void>;
}
export {};
