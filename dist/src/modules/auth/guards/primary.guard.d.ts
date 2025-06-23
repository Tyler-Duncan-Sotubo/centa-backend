import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { db } from 'src/drizzle/types/drizzle';
import { PermissionsService } from '../permissions/permissions.service';
export declare class PrimaryGuard implements CanActivate {
    private jwtService;
    private configService;
    private readonly db;
    private readonly permissionsService;
    constructor(jwtService: JwtService, configService: ConfigService, db: db, permissionsService: PermissionsService);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private extractTokenFromHeader;
    private validate;
}
