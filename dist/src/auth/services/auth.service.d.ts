import { UserService } from './user.service';
import { TokenGeneratorService } from './token-generator.service';
import { LoginDto } from '../dto';
import { db } from '../../drizzle/types/drizzle';
import { Response } from 'express';
import { PasswordResetService } from './password-reset.service';
export declare class AuthService {
    private readonly userService;
    private readonly tokenGeneratorService;
    private readonly passwordResetService;
    private db;
    constructor(userService: UserService, tokenGeneratorService: TokenGeneratorService, passwordResetService: PasswordResetService, db: db);
    login(payload: LoginDto, response: Response): Promise<void>;
    private validateUser;
}
