import { ConfigService } from '@nestjs/config';
import { NewsletterRecipientDto } from '../dto/newsletter-recipient.dto';
export declare class NewsletterEmailService {
    private readonly config;
    private readonly logger;
    constructor(config: ConfigService);
    sendNewsletter(recipients: NewsletterRecipientDto[], opts?: {
        campaignName?: string;
        categories?: string[];
    }): Promise<void>;
}
