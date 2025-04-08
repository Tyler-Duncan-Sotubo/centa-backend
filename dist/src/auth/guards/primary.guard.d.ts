import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { db } from '../../drizzle/types/drizzle';
export declare class PrimaryGuard implements CanActivate {
    private jwtService;
    private configService;
    private readonly db;
    constructor(jwtService: JwtService, configService: ConfigService, db: db);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private extractTokenFromHeader;
    private validate;
}
