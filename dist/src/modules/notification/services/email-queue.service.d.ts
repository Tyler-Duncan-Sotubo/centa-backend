import { Queue } from 'bullmq';
import { NewsletterRecipientDto } from '../dto/newsletter-recipient.dto';
export declare class EmailQueueService {
    private readonly queue;
    constructor(queue: Queue);
    enqueueNewsletter(recipients: NewsletterRecipientDto[], opts?: {
        campaignName?: string;
        categories?: string[];
    }): Promise<void>;
}
