import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class EmailVerificationService implements OnModuleInit {
    private config;
    private readonly logger;
    constructor(config: ConfigService);
    onModuleInit(): void;
    private sendWithRetry;
    sendVerifyEmail(email: string, token: string, companyName?: string): Promise<void>;
    sendVerifyLogin(email: string, token: string): Promise<void>;
}
