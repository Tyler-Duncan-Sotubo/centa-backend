import { ConfigService } from '@nestjs/config';
export declare class EmailVerificationService {
    private config;
    constructor(config: ConfigService);
    sendVerifyEmail(email: string, token: string, companyName?: string): Promise<void>;
    sendVerifyLogin(email: string, token: string): Promise<void>;
}
