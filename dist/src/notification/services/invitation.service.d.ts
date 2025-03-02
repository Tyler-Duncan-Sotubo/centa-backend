import { ConfigService } from '@nestjs/config';
export declare class InvitationService {
    private config;
    constructor(config: ConfigService);
    sendInvitationEmail(email: string, name: string, url: string): Promise<void>;
}
