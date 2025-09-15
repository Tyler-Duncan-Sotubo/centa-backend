// src/email/services/newsletter-email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import { MailDataRequired } from '@sendgrid/mail';
import { NewsletterRecipientDto } from '../dto/newsletter-recipient.dto';

@Injectable()
export class NewsletterEmailService {
  private readonly logger = new Logger(NewsletterEmailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendNewsletter(
    recipients: NewsletterRecipientDto[],
    opts?: { campaignName?: string; categories?: string[] },
  ) {
    if (!recipients?.length) return;

    sgMail.setApiKey(this.config.get<string>('SEND_GRID_KEY') || '');

    const templateId = this.config.get<string>('NEWSLETTER_TEMPLATE_ID');
    const fromEmail = 'marketing@centahr.com';
    const fromName = 'CentaHR';

    if (!templateId) {
      throw new Error('NEWSLETTER_TEMPLATE_ID missing in config');
    }

    const personalizations: MailDataRequired['personalizations'] =
      recipients.map((r) => ({
        to: [{ email: r.email, name: r.name }],
        dynamicTemplateData: {
          subject: 'Cut HR admin by 40% with AI-driven efficiency',
          first_name: r.name || 'there',
          companyName: r.companyName || '',
        },
      }));

    const msg: MailDataRequired = {
      from: { email: fromEmail, name: fromName },
      templateId,
      subject: 'Cut HR admin by 40% with AI-driven efficiency',
      personalizations,
      categories: ['newsletter', ...(opts?.categories || [])],
      customArgs: opts?.campaignName
        ? { campaign: opts.campaignName }
        : undefined,
      trackingSettings: {
        clickTracking: { enable: true, enableText: true },
        openTracking: { enable: true },
      },
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`Newsletter sent: ${recipients.length} recipients.`);
    } catch (error: any) {
      this.logger.error(
        'Newsletter send failed',
        error?.response?.body || error,
      );
      throw error;
    }
  }
}
