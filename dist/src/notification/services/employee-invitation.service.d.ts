import { ConfigService } from '@nestjs/config';
export declare class EmployeeInvitationService {
    private config;
    constructor(config: ConfigService);
    sendInvitationEmail(email: string, name: string, companyName: string, role: string, url: string): Promise<void>;
}
