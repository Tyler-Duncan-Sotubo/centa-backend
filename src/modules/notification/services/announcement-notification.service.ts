// src/modules/notification/announcement-notification.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

export interface AnnouncementPayload {
  toEmail: string;
  subject: string;
  firstName: string;
  title: string;
  body: string;
  publishedAt?: string;
  expiresAt?: string;
  companyName: string;
  meta?: Record<string, any>;
}

export interface AssessmentReminderPayload {
  toEmail: string;
  subject?: string;
  firstName: string;

  employeeName: string;
  reviewerName?: string;

  cycleName: string;
  dueDate?: string;

  companyName: string;

  meta?: Record<string, any>; // assessmentId etc
}

@Injectable()
export class AnnouncementNotificationService {
  constructor(private readonly config: ConfigService) {}

  // ---------------------------------------------------------------------------
  // Announcement
  // ---------------------------------------------------------------------------
  async sendNewAnnouncement(payload: AnnouncementPayload) {
    const apiKey = this.config.get<string>('SEND_GRID_KEY') || '';
    sgMail.setApiKey(apiKey);

    const templateId =
      this.config.get<string>('ANNOUNCEMENT_TEMPLATE_ID') || '';

    const url = `${this.config.get(
      'EMPLOYEE_PORTAL_URL',
    )}/ess/announcement/${payload.meta?.announcementId || ''}`;

    const msg = {
      to: payload.toEmail,
      from: {
        name: payload.companyName || 'Announcements',
        email: 'noreply@centahr.com',
      },
      templateId,
      subject: payload.subject,
      dynamicTemplateData: {
        firstName: payload.firstName,
        title: payload.title,
        url,
        body: payload.body,
        publishedAt: payload.publishedAt,
        expiresAt: payload.expiresAt,
        companyName: payload.companyName,
        subject: payload.subject,
        ...payload.meta,
      },
    };

    try {
      await sgMail.send(msg as any);
    } catch (error: any) {
      console.error(
        '[AnnouncementNotificationService] sendNewAnnouncement failed',
        error,
      );
      if (error?.response?.body) console.error(error.response.body);
    }
  }

  // ---------------------------------------------------------------------------
  // ✅ Assessment Reminder
  // ---------------------------------------------------------------------------
  async sendAssessmentReminder(payload: AssessmentReminderPayload) {
    const apiKey = this.config.get<string>('SEND_GRID_KEY') || '';
    sgMail.setApiKey(apiKey);

    const templateId =
      this.config.get<string>('ASSESSMENT_REMINDER_TEMPLATE_ID') || '';

    const url = `${this.config.get(
      'EMPLOYEE_PORTAL_URL',
    )}/ess/performance/reviews/${payload.meta?.assessmentId || ''}`;

    const msg = {
      to: payload.toEmail,
      from: {
        name: payload.companyName || 'Performance Team',
        email: 'noreply@centahr.com',
      },
      templateId,
      subject: payload.subject, // optional if template owns subject
      dynamicTemplateData: {
        firstName: payload.firstName,
        employeeName: payload.employeeName,
        reviewerName: payload.reviewerName,
        cycleName: payload.cycleName,
        dueDate: payload.dueDate,
        companyName: payload.companyName,
        url,
        subject: payload.subject,
        ...payload.meta,
      },
    };

    try {
      await sgMail.send(msg as any);
    } catch (error: any) {
      console.error(
        '[AnnouncementNotificationService] sendAssessmentReminder failed',
        error,
      );
      if (error?.response?.body) console.error(error.response.body);
      // throw if you want retry behavior
    }
  }
}
