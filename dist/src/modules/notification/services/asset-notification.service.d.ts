import { ConfigService } from '@nestjs/config';
type AssetStatus = 'requested' | 'approved' | 'rejected';
export interface AssetStatusEmailPayload {
    toEmail: string;
    managerName: string;
    employeeName: string;
    assetType: string;
    purpose: string;
    urgency: string;
    notes?: string;
    companyName: string;
    status: AssetStatus;
    rejectionReason?: string;
    remarks?: string;
    actionUrl?: string;
    assetRequestId?: string;
    employeeId?: string;
    approverId?: string;
    meta?: Record<string, any>;
}
export declare class AssetNotificationService {
    private readonly config;
    constructor(config: ConfigService);
    private readonly logoUrl;
    private ensureSendGrid;
    private buildSubject;
    private buildStatusTitle;
    private buildStatusMessage;
    private buildActionUrl;
    private pickTemplateId;
    sendAssetEmail(payload: AssetStatusEmailPayload): Promise<void>;
    sendAssetApprovalRequestEmail(payload: Omit<AssetStatusEmailPayload, 'status'>): Promise<void>;
    sendAssetDecisionEmail(payload: Omit<AssetStatusEmailPayload, 'status'> & {
        status: 'approved' | 'rejected';
    }): Promise<void>;
}
export {};
