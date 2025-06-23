import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmailVerificationService {
  constructor(private config: ConfigService) {}
  async sendVerifyEmail(email: string, token: string) {
    sgMail.setApiKey(this.config.get<string>('SEND_GRID_KEY') || '');
    const msg = {
      to: email,
      from: {
        name: 'Verify Email',
        email: 'welcome@centa.africa',
      },
      templateId: this.config.get('VERIFY_TEMPLATE_ID'),
      dynamicTemplateData: {
        verifyLink: `${token}`,
        email: email,
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

  async sendVerifyLogin(email: string, token: string) {
    sgMail.setApiKey(this.config.get<string>('SEND_GRID_KEY') || '');
    const msg = {
      to: 'tylertooxclusive@gmail.com',
      from: {
        name: 'Please confirm your account',
        email: 'noreply@centa.africa',
      },
      templateId: this.config.get('VERIFY_LOGIN_TEMPLATE_ID'),
      dynamicTemplateData: {
        verifyLink: `${token}`,
        email: email,
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
