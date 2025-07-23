import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class OfferEmailService {
  constructor(private config: ConfigService) {}
  async sendOfferEmail(
    email: string,
    candidateName: string,
    jobTitle: string,
    companyName: string,
    offerUrl: string,
    companyLogo?: string,
  ) {
    sgMail.setApiKey(this.config.get<string>('SEND_GRID_KEY') || '');

    const msg = {
      to: email,
      from: {
        name: `${companyName} HR`,
        email: 'noreply@centahr.com',
      },
      templateId: this.config.get('OFFER_TEMPLATE_ID'),
      dynamicTemplateData: {
        name: candidateName,
        jobTitle,
        companyName,
        offerLink: offerUrl,
        subject: `Your Job Offer for ${jobTitle} at ${companyName}`,
        companyLogo,
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
