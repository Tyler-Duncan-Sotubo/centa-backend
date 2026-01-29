// src/modules/notification/asset-notification.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

type AssetStatus = 'requested' | 'approved' | 'rejected';

export interface AssetStatusEmailPayload {
  toEmail: string;

  // template data (camelCase)
  managerName: string; // approver / line manager name (for "requested")
  employeeName: string; // requester name
  assetType: string;
  purpose: string;
  urgency: string;
  notes?: string;
  companyName: string;

  // status driver
  status: AssetStatus;
  rejectionReason?: string; // optional (for rejected)
  remarks?: string; // optional (approved/rejected comments)

  // link (you said: use request action url here)
  actionUrl?: string;

  // ids (optional)
  assetRequestId?: string;
  employeeId?: string;
  approverId?: string;

  meta?: Record<string, any>;
}

@Injectable()
export class AssetNotificationService {
  constructor(private readonly config: ConfigService) {}

  private readonly logoUrl =
    'https://centa-hr.s3.eu-west-3.amazonaws.com/company-files/7beedcd5-66c3-4351-8955-ddcab3528652/5cf61059-52be-4c46-9d4e-9817f2b9257b/1769600186954-1768990436384-logo-CqG_6WrI.png';

  private ensureSendGrid() {
    sgMail.setApiKey(this.config.get<string>('SEND_GRID_KEY') || '');
  }

  private buildSubject(status: AssetStatus, assetType?: string) {
    const type = assetType ? ` – ${assetType}` : '';
    if (status === 'requested') return `Approval Needed: Asset Request${type}`;
    if (status === 'approved') return `Asset Request Approved${type}`;
    return `Asset Request Rejected${type}`;
  }

  private buildStatusTitle(status: AssetStatus) {
    if (status === 'requested') return 'Requested';
    if (status === 'approved') return 'Approved';
    return 'Rejected';
  }

  private buildStatusMessage(status: AssetStatus) {
    if (status === 'requested')
      return 'an asset request has been submitted and is awaiting your review.';
    if (status === 'approved') return 'your asset request has been approved.';
    return 'your asset request has been rejected.';
  }

  /**
   * You asked:
   * - request email (requested) should go to dashboard
   * - status emails (approved/rejected) should go to ESS
   * - but we can use payload.actionUrl if provided (preferred)
   */
  private buildActionUrl(payload: AssetStatusEmailPayload) {
    if (payload.actionUrl) return payload.actionUrl;

    const base = this.config.get<string>('EMPLOYEE_PORTAL_URL') || '';
    if (!base) return undefined;

    // requested -> manager approval dashboard
    if (payload.status === 'requested') {
      return `${base}/dashboard/assets`;
    }

    // approved/rejected -> employee ESS history/details
    return `${base}/ess/assets`;
  }

  private pickTemplateId(status: AssetStatus) {
    // ✅ two templates:
    // - requested => ASSET_REQUEST_TEMPLATE_ID
    // - approved/rejected => ASSET_STATUS_TEMPLATE_ID
    if (status === 'requested') {
      return this.config.get<string>('ASSET_REQUEST_TEMPLATE_ID') || '';
    }
    return this.config.get<string>('ASSET_STATUS_TEMPLATE_ID') || '';
  }

  /**
   * Core sender: selects template by status:
   * - requested => ASSET_REQUEST_TEMPLATE_ID (to manager/dashboard)
   * - approved/rejected => ASSET_STATUS_TEMPLATE_ID (to employee/ess)
   */
  async sendAssetEmail(payload: AssetStatusEmailPayload) {
    this.ensureSendGrid();

    const templateId = this.pickTemplateId(payload.status);
    const actionUrl = this.buildActionUrl(payload);

    const msg = {
      to: payload.toEmail,
      from: {
        name: 'CentaHR',
        email: 'noreply@centahr.com',
      },
      templateId,
      dynamicTemplateData: {
        // common
        subject: this.buildSubject(payload.status, payload.assetType),
        logoUrl: this.logoUrl,
        companyName: payload.companyName,

        // status
        status: payload.status,
        statusTitle: this.buildStatusTitle(payload.status),
        statusMessage: this.buildStatusMessage(payload.status),

        // asset details
        managerName: payload.managerName,
        employeeName: payload.employeeName,
        assetType: payload.assetType,
        purpose: payload.purpose,
        urgency: payload.urgency,
        notes: payload.notes,

        // reasons/remarks (optional)
        rejectionReason: payload.rejectionReason,
        remarks: payload.remarks,

        // CTA
        actionUrl,
        actionText:
          payload.status === 'requested' ? 'Review Request' : 'View Request',

        // ids (optional)
        assetRequestId: payload.assetRequestId,
        employeeId: payload.employeeId,
        approverId: payload.approverId,

        meta: payload.meta,
      },
    };

    try {
      await sgMail.send(msg as any);
    } catch (error: any) {
      console.error('[AssetNotificationService] sendAssetEmail failed', error);
      if (error?.response) console.error(error.response.body);
    }
  }

  /** Manager request email (requested) */
  async sendAssetApprovalRequestEmail(
    payload: Omit<AssetStatusEmailPayload, 'status'>,
  ) {
    return this.sendAssetEmail({ ...payload, status: 'requested' });
  }

  /** Employee status email (approved/rejected) */
  async sendAssetDecisionEmail(
    payload: Omit<AssetStatusEmailPayload, 'status'> & {
      status: 'approved' | 'rejected';
    },
  ) {
    return this.sendAssetEmail(payload);
  }
}
