import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmployeeInvitationService {
  constructor(private config: ConfigService) {}
  async sendInvitationEmail(
    email: string,
    name: string,
    companyName: string,
    role: string,
    url: string,
  ) {
    sgMail.setApiKey(this.config.get<string>('SEND_GRID_KEY') || '');

    const msg = {
      to: email,
      from: {
        name: 'Employee Invitation',
        email: 'noreply@centahr.com',
      },
      templateId: this.config.get('EMPLOYEE_INVITE_TEMPLATE_ID'),
      dynamicTemplateData: {
        name: name,
        verifyLink: url,
        companyName: companyName,
        role: role,
        subject: `Invitation to Join ${companyName} as ${role}`,
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
