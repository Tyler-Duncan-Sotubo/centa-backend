import { UserService } from './user.service';
import { TokenGeneratorService } from './token-generator.service';
import { LoginDto } from '../dto';
import { db } from '../../drizzle/types/drizzle';
import { Response } from 'express';
import { AuditService } from 'src/audit/audit.service';
export declare class AuthService {
    private readonly userService;
    private readonly tokenGeneratorService;
    private readonly auditService;
    private db;
    constructor(userService: UserService, tokenGeneratorService: TokenGeneratorService, auditService: AuditService, db: db);
    login(payload: LoginDto, response: Response): Promise<void>;
    private validateUser;
    logout(response: Response): Promise<void>;
}
