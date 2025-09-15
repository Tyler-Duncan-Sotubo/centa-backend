// src/email/email-queue.service.ts
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NewsletterRecipientDto } from '../dto/newsletter-recipient.dto';

@Injectable()
export class EmailQueueService {
  constructor(@InjectQueue('emailQueue') private readonly queue: Queue) {}

  async enqueueNewsletter(
    recipients: NewsletterRecipientDto[],
    opts?: { campaignName?: string; categories?: string[] },
  ) {
    const CHUNK = 800; // keep margin under SendGrid's ~1000 personalizations/request
    for (let i = 0; i < recipients.length; i += CHUNK) {
      const slice = recipients.slice(i, i + CHUNK);

      await this.queue.add(
        'sendNewsletter',
        { recipients: slice, ...opts },
        {
          attempts: 5,
          backoff: { type: 'exponential', delay: 15_000 },
          removeOnComplete: true,
          // leave fails for inspection; flip to true in prod if you prefer auto-clean
          removeOnFail: false,
        },
      );
    }
  }
}
