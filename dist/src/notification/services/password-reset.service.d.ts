import { ConfigService } from '@nestjs/config';
export declare class PasswordResetEmailService {
    private config;
    constructor(config: ConfigService);
    sendPasswordResetEmail(email: string, name: string, url: string): Promise<void>;
}
