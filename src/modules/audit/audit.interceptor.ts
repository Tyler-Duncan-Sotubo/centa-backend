// src/modules/audit/audit.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';
import { AUDIT_META_KEY } from './constant/audit.constant';

export interface AuditMeta {
  action: string;
  entity: string;
  getEntityId?: (req: any) => string;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const meta = this.reflector.get<AuditMeta>(
      AUDIT_META_KEY,
      context.getHandler(),
    );

    if (!meta) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();
    const userId = req.user?.id as string;
    const entityId = meta.getEntityId ? meta.getEntityId(req) : undefined;
    const forwarded = req.headers['x-forwarded-for'];
    const ip = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded || req.socket?.remoteAddress || req.connection?.remoteAddress;

    return next.handle().pipe(
      tap({
        next: () => {
          this.auditService.logAction({
            action: meta.action,
            entity: meta.entity,
            userId,
            entityId,
            ipAddress: req.ip,
          });
        },
        error: (err) => {
          const safeMessage =
            err?.response?.message || err?.message || 'Unknown error';
          this.auditService.logAction({
            action: `${meta.action}_FAILED`,
            entity: meta.entity,
            userId,
            entityId,
            details: safeMessage,
            ipAddress: ip,
          });
        },
      }),
    );
  }
}
