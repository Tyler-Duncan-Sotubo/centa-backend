import { ConfigService } from '@nestjs/config';
export declare class PayrollApprovalEmailService {
    private config;
    constructor(config: ConfigService);
    sendApprovalEmail(email: string, name: string, url: string, month: string, companyName: string): Promise<void>;
}
