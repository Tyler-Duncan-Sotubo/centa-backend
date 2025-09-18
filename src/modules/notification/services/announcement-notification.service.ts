// src/modules/notification/notification.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

export interface AnnouncementPayload {
  toEmail: string;
  subject: string; // optional if template defines its own subject
  firstName: string;
  title: string;
  body: string;
  publishedAt?: string;
  expiresAt?: string;
  companyName: string;
  meta?: Record<string, any>; // optional extra dynamic fields
}

@Injectable()
export class AnnouncementNotificationService {
  constructor(private readonly config: ConfigService) {}

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
      subject: payload.subject, // omit if subject handled in template
      dynamicTemplateData: {
        firstName: payload.firstName,
        title: payload.title,
        url,
        body: payload.body,
        publishedAt: payload.publishedAt,
        expiresAt: payload.expiresAt,
        companyName: payload.companyName,
        subject: payload.subject,
        ...payload.meta, // pass along any additional dynamic fields
      },
    };

    try {
      await sgMail.send(msg as any);
    } catch (error: any) {
      console.error(
        '[AnnouncementNotificationService] sendNewAnnouncement failed',
        error,
      );
      if (error?.response?.body) {
        console.error(error.response.body);
      }
      // throw error; // uncomment if you want caller to handle errors
    }
  }
}
