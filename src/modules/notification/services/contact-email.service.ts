import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import { CreateMessageDto } from '../dto/create-message.dto';

@Injectable()
export class ContactEmailService {
  constructor(private config: ConfigService) {}
  async sendContactEmail(dto: CreateMessageDto) {
    sgMail.setApiKey(this.config.get<string>('SEND_GRID_KEY') || '');
    const { email, name, message, phone, website } = dto;
    const msg = {
      to: this.config.get<string>('NOTIFY_EMAIL_TO'),
      from: {
        name: 'noreply@centahr.com',
        email: 'noreply@centahr.com',
      },
      templateId: this.config.get('CONTACT_TEMPLATE_ID'),
      dynamicTemplateData: {
        email,
        name,
        message,
        phone: phone || 'N/A',
        website: website || 'N/A',
        subject: `New Contact Us Message from ${name}`,
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
