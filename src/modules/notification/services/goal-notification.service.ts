// src/modules/notification/notification.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

interface GoalCheckinPayload {
  goalTitle: string;
  toEmail: string;
  subject: string;
  body: string;
  meta?: Record<string, any>; // flexible metadata (e.g. goalId)
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

@Injectable()
export class GoalNotificationService {
  constructor(private readonly config: ConfigService) {}

  async sendGoalCheckin(payload: GoalCheckinPayload) {
    sgMail.setApiKey(this.config.get<string>('SEND_GRID_KEY') || '');

    const templateId =
      this.config.get<string>('GOAL_CHECKIN_TEMPLATE_ID') || '';

    const goalPage = `${this.config.get(
      'EMPLOYEE_PORTAL_URL',
    )}/dashboard/performance/goals/${payload.meta?.goalId || ''}`;

    const msg = {
      to: payload.toEmail,
      from: {
        name: 'Goal Check-in',
        email: 'noreply@centa.africa',
      },
      templateId,
      dynamicTemplateData: {
        subject: payload.subject,
        body: payload.body,
        goalId: payload.meta?.goalId,
        url: goalPage,
        // you can add more dynamic fields here if your template expects them
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
    )}/dashboard/performance/goals/${payload.meta?.goalId || ''}`;

    console.log(payload);

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
}
