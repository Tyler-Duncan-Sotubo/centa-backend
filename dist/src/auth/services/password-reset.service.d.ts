import { db } from '../../drizzle/types/drizzle';
import { PasswordResetEmailService } from 'src/notification/services/password-reset.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
export declare class PasswordResetService {
    private db;
    private readonly passwordResetEmailService;
    private configService;
    private jwtService;
    constructor(db: db, passwordResetEmailService: PasswordResetEmailService, configService: ConfigService, jwtService: JwtService);
    generatePasswordResetToken(email: string): Promise<string>;
    resetPassword(token: string, password: string): Promise<{
        message: string;
    }>;
    invitationPasswordReset(token: string, password: string): Promise<{
        message: string;
    }>;
}
