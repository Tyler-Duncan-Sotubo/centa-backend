import { ConfigService } from '@nestjs/config';
export declare class OfferEmailService {
    private config;
    constructor(config: ConfigService);
    sendOfferEmail(email: string, candidateName: string, jobTitle: string, companyName: string, offerUrl: string, companyLogo?: string): Promise<void>;
}
