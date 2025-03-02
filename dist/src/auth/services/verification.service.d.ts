import { db } from '../../drizzle/types/drizzle';
import { TokenDto } from '../dto';
import { EmailVerificationService } from 'src/notification/services/email-verification.service';
export declare class VerificationService {
    private db;
    private readonly emailVerificationService;
    constructor(db: db, emailVerificationService: EmailVerificationService);
    generateVerificationToken(userId: string): Promise<string>;
    verifyToken(dto: TokenDto): Promise<object>;
}
