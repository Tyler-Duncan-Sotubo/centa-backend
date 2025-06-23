import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrimaryGuard } from './primary.guard';
export declare class JwtAuthGuard implements CanActivate {
    private readonly reflector;
    private readonly jwtGuard;
    private readonly logger;
    constructor(reflector: Reflector, jwtGuard: PrimaryGuard);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private handleUnauthorized;
    private logError;
    private writeErrorLogToFile;
}
