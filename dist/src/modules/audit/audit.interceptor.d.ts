import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { AuditService } from './audit.service';
export interface AuditMeta {
    action: string;
    entity: string;
    getEntityId?: (req: any) => string;
}
export declare class AuditInterceptor implements NestInterceptor {
    private readonly auditService;
    private readonly reflector;
    constructor(auditService: AuditService, reflector: Reflector);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
}
