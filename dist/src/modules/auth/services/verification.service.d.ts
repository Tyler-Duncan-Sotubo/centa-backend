import { TokenDto } from '../dto';
import { db } from 'src/drizzle/types/drizzle';
import { EmailVerificationService } from 'src/modules/notification/services/email-verification.service';
export declare class VerificationService {
    private db;
    private readonly emailVerificationService;
    constructor(db: db, emailVerificationService: EmailVerificationService);
    generateVerificationToken(userId: string, companyName?: string): Promise<string>;
    verifyToken(dto: TokenDto): Promise<object>;
}
