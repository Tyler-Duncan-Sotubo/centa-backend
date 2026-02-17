// src/modules/notification/notification.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

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
  dueDate: string; // format: YYYY-MM-DD or formatted string
  description: string;
  progress: string; // e.g. "Not started", "In progress"
  meta?: Record<string, any>; // e.g. goalId
}

interface GoalUpdatePayload {
  toEmail: string;
  subject: string;
  firstName: string;
  addedBy: string;
  title: string;
  meta?: Record<string, any>; // e.g. goalId
}

interface GoalApprovalRequestPayload {
  toEmail: string; // manager email
  subject: string;
  employeeName: string;
  managerName: string;
  title: string;
  dueDate: string;
  description: string;
  meta?: Record<string, any>; // goalId, employeeId, etc.
}

@Injectable()
export class GoalNotificationService {
  constructor(private readonly config: ConfigService) {}

  async sendGoalCheckin(payload: GoalCheckinPayload) {
    sgMail.setApiKey(this.config.get<string>('SEND_GRID_KEY') || '');

    const templateId =
      this.config.get<string>('GOAL_CHECKIN_TEMPLATE_ID') || '';

    const goalPage = `${this.config.get(
      'EMPLOYEE_PORTAL_URL',
    )}/ess/performance/goals/${payload.meta?.goalId || ''}`;

    const msg = {
      to: payload.toEmail,
      from: {
        name: 'Goal Check-in',
        email: 'noreply@centahr.com',
      },
      templateId,
      dynamicTemplateData: {
        // ✅ SUBJECT
        subject: payload.subject,

        // ✅ PERSON
        firstName: payload.firstName,
        employeeName: payload.employeeName,

        // ✅ GOAL
        title: payload.title,
        dueDate: payload.dueDate,

        // ✅ SYSTEM
        companyName: payload.companyName,

        // ✅ LINKS
        goalId: payload.meta?.goalId,
        url: goalPage,

        // optional extra
        bucket: payload.meta?.bucket,
      },
    };

    try {
      await sgMail.send(msg as any);
    } catch (error: any) {
      console.error('[NotificationService] sendGoalCheckin failed', error);
      if (error.response) {
        console.error(error.response.body);
      }
    }
  }

  async sendGoalAssignment(payload: GoalAssignmentPayload) {
    sgMail.setApiKey(this.config.get<string>('SEND_GRID_KEY') || '');

    const templateId = this.config.get<string>('GOAL_ASSIGNMENT_TEMPLATE_ID');

    const goalPage = `${this.config.get(
      'EMPLOYEE_PORTAL_URL',
    )}/ess/performance/goals/${payload.meta?.goalId || ''}`;

    const msg = {
      to: payload.toEmail,
      from: {
        name: 'Goal Assignment',
        email: 'noreply@centahr.com',
      },
      templateId,
      dynamicTemplateData: {
        subject: payload.subject,
        assignedBy: payload.assignedBy,
        assignedTo: payload.assignedTo,
        title: payload.title,
        dueDate: payload.dueDate,
        description: payload.description,
        progress: payload.progress,
        url: goalPage,
      },
    };

    try {
      await sgMail.send(msg as any);
    } catch (error: any) {
      console.error('[NotificationService] sendGoalAssignment failed', error);
      if (error.response) {
        console.error(error.response.body);
      }
    }
  }

  async sendGoalUpdates(payload: GoalUpdatePayload) {
    sgMail.setApiKey(this.config.get<string>('SEND_GRID_KEY') || '');

    const templateId = this.config.get<string>('GOAL_UPDATE_TEMPLATE_ID');

    const goalPage = `${this.config.get(
      'EMPLOYEE_PORTAL_URL',
    )}/ess/performance/goals/${payload.meta?.goalId || ''}`;

    const msg = {
      to: payload.toEmail,
      from: {
        name: 'Goal Updates',
        email: 'noreply@centahr.com',
      },
      templateId,
      dynamicTemplateData: {
        subject: payload.subject,
        firstName: payload.firstName,
        addedBy: payload.addedBy,
        title: payload.title,
        url: goalPage,
      },
    };

    try {
      await sgMail.send(msg as any);
    } catch (error: any) {
      console.error('[NotificationService] sendGoalAssignment failed', error);
      if (error.response) {
        console.error(error.response.body);
      }
    }
  }

  async sendGoalApprovalRequest(payload: GoalApprovalRequestPayload) {
    sgMail.setApiKey(this.config.get<string>('SEND_GRID_KEY') || '');

    const templateId =
      this.config.get<string>('GOAL_APPROVAL_REQUEST_TEMPLATE_ID') || '';

    const approvalPage = `${this.config.get(
      'EMPLOYEE_PORTAL_URL',
    )}/dashboard/performance/goals`;

    const msg = {
      to: payload.toEmail,
      from: {
        name: 'Goal Approval Required',
        email: 'noreply@centahr.com',
      },
      templateId,
      dynamicTemplateData: {
        subject: payload.subject,
        managerName: payload.managerName,
        employeeName: payload.employeeName,
        title: payload.title,
        dueDate: payload.dueDate,
        description: payload.description,
        url: approvalPage,
      },
    };

    try {
      await sgMail.send(msg as any);
    } catch (error: any) {
      console.error(
        '[NotificationService] sendGoalApprovalRequest failed',
        error,
      );
      if (error.response) {
        console.error(error.response.body);
      }
    }
  }
}
