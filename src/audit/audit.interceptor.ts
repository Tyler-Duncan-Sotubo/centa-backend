// audit/audit.interceptor.ts

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';

interface AuditMeta {
  action: string;
  entity: string;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditMeta = this.reflector.get<AuditMeta>(
      'audit',
      context.getHandler(),
    );

    if (!auditMeta) return next.handle(); // Skip if no audit decorator

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    return next.handle().pipe(
      tap(async () => {
        await this.auditService.logAction(
          auditMeta.action,
          auditMeta.entity,
          userId,
        );
      }),
    );
  }
}
