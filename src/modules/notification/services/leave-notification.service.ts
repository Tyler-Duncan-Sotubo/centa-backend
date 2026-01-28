// src/modules/notification/leave-notification.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveStatusEmailPayload {
  toEmail: string;

  // template data (camelCase)
  managerName: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: string;
  reason?: string;
  companyName: string;

  // status driver
  status: LeaveStatus;
  rejectionReason?: string;

  // link
  actionUrl?: string;

  // ids
  leaveRequestId?: string;
  employeeId?: string;
  approverId?: string;

  meta?: Record<string, any>;
}

@Injectable()
export class LeaveNotificationService {
  constructor(private readonly config: ConfigService) {}

  private readonly logoUrl =
    'https://centa-hr.s3.eu-west-3.amazonaws.com/company-files/7beedcd5-66c3-4351-8955-ddcab3528652/5cf61059-52be-4c46-9d4e-9817f2b9257b/1769600186954-1768990436384-logo-CqG_6WrI.png';

  private ensureSendGrid() {
    sgMail.setApiKey(this.config.get<string>('SEND_GRID_KEY') || '');
  }

  private buildSubject(status: LeaveStatus) {
    if (status === 'pending') return 'Approval Needed: Leave Request';
    if (status === 'approved') return 'Leave Request Approved';
    return 'Leave Request Rejected';
  }

  private buildStatusTitle(status: LeaveStatus) {
    if (status === 'pending') return 'Pending';
    if (status === 'approved') return 'Approved';
    return 'Rejected';
  }

  private buildStatusMessage(status: LeaveStatus) {
    if (status === 'pending')
      return 'a leave request has been submitted and is awaiting your review.';
    if (status === 'approved') return 'the leave request has been approved.';
    return 'the leave request has been rejected.';
  }

  private buildActionUrl(payload: LeaveStatusEmailPayload) {
    if (payload.actionUrl) return payload.actionUrl;

    const base = this.config.get<string>('EMPLOYEE_PORTAL_URL') || '';
    if (!base) return undefined;

    // pending -> manager approval page
    if (payload.status === 'pending') {
      return `${base}/dashboard/leave}`;
    }

    // approved/rejected -> employee history/details page
    return `${base}/ess/leave}`;
  }

  private pickTemplateId(status: LeaveStatus) {
    // ✅ two different templates as you requested
    if (status === 'pending') {
      return this.config.get<string>('LEAVE_REQUEST_TEMPLATE_ID') || '';
    }
    return this.config.get<string>('LEAVE_STATUS_TEMPLATE_ID') || '';
  }

  /**
   * Core sender: selects template by status:
   * - pending => LEAVE_REQUEST_TEMPLATE_ID
   * - approved/rejected => LEAVE_STATUS_TEMPLATE_ID
   */
  async sendLeaveEmail(payload: LeaveStatusEmailPayload) {
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
        subject: this.buildSubject(payload.status),
        logoUrl: this.logoUrl,
        companyName: payload.companyName,

        // status
        status: payload.status,
        statusTitle: this.buildStatusTitle(payload.status),
        statusMessage: this.buildStatusMessage(payload.status),

        // leave details
        managerName: payload.managerName,
        employeeName: payload.employeeName,
        leaveType: payload.leaveType,
        startDate: payload.startDate,
        endDate: payload.endDate,
        totalDays: payload.totalDays,
        reason: payload.reason,
        rejectionReason: payload.rejectionReason,

        // CTA
        actionUrl,
        actionText: 'View Request',

        // ids (optional)
        leaveRequestId: payload.leaveRequestId,
        employeeId: payload.employeeId,
        approverId: payload.approverId,

        meta: payload.meta,
      },
    };

    try {
      await sgMail.send(msg as any);
    } catch (error: any) {
      console.error('[LeaveNotificationService] sendLeaveEmail failed', error);
      if (error?.response) console.error(error.response.body);
    }
  }

  /** Manager request email (pending) */
  async sendLeaveApprovalRequestEmail(
    payload: Omit<LeaveStatusEmailPayload, 'status'>,
  ) {
    return this.sendLeaveEmail({ ...payload, status: 'pending' });
  }

  /** Employee status email (approved/rejected) */
  async sendLeaveDecisionEmail(
    payload: Omit<LeaveStatusEmailPayload, 'status'> & {
      status: 'approved' | 'rejected';
    },
  ) {
    return this.sendLeaveEmail(payload);
  }
}
