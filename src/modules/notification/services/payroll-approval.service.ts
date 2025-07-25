import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class PayrollApprovalEmailService {
  constructor(private config: ConfigService) {}
  async sendApprovalEmail(
    email: string,
    name: string,
    url: string,
    month: string,
    companyName: string,
  ) {
    sgMail.setApiKey(this.config.get<string>('SEND_GRID_KEY') || '');
    const msg = {
      to: email,
      from: {
        name: 'noreply@centahr.com',
        email: 'noreply@centahr.com',
      },
      templateId: this.config.get('PAYROLL_APPROVAL_TEMPLATE_ID'),
      dynamicTemplateData: {
        email,
        month,
        url,
        name,
        subject: `Action Required: Approve Payroll for ${month}`,
        companyName,
      },
    };

    (async () => {
      try {
        await sgMail.send(msg);
      } catch (error) {
        console.error(error);

        if (error.response) {
          console.error(error.response.body);
        }
      }
    })();
  }
}
