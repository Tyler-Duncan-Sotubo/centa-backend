import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class PasswordResetEmailService {
  constructor(private config: ConfigService) {}
  async sendPasswordResetEmail(email: string, name: string, url: string) {
    sgMail.setApiKey(this.config.get<string>('SEND_GRID_KEY') || '');

    const msg = {
      to: email,
      from: {
        name: 'noreply@centahr.com',
        email: 'noreply@centahr.com',
      },
      templateId: this.config.get('PASSWORD_RESET_TEMPLATE_ID'),
      dynamicTemplateData: {
        name: name,
        verifyLink: url,
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
