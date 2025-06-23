// src/modules/audit/audit.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { auditLogs } from './schema';
import { companyRoles, users } from '../auth/schema';
import { desc, eq, sql, and } from 'drizzle-orm';

@Injectable()
export class AuditService {
  constructor(@Inject(DRIZZLE) private db: db) {}

  async logAction(params: {
    action: string;
    entity: string;
    userId: string;
    entityId?: string;
    details?: string;
    changes?: any;
    ipAddress?: string;
    correlationId?: string;
  }): Promise<void> {
    await this.db
      .insert(auditLogs)
      .values({
        action: params.action,
        entity: params.entity,
        userId: params.userId,
        entityId: params.entityId,
        details: params.details,
        changes: params.changes,
        ipAddress: params.ipAddress,
        correlationId: params.correlationId,
      })
      .execute();
  }

  async bulkLogActions(
    entries: Array<{
      action: string;
      entity: string;
      userId: string;
      entityId?: string;
      details?: string;
      changes?: any;
      ipAddress?: string;
      correlationId?: string;
    }>,
  ): Promise<void> {
    if (!entries || entries.length === 0) {
      return; // Nothing to insert
    }

    await this.db
      .insert(auditLogs)
      .values(
        entries.map((entry) => ({
          action: entry.action,
          entity: entry.entity,
          userId: entry.userId,
          entityId: entry.entityId,
          details: entry.details,
          changes: entry.changes,
          ipAddress: entry.ipAddress,
          correlationId: entry.correlationId,
        })),
      )
      .execute();
  }

  async getAuditLogs(companyId: string) {
    return this.db
      .select({
        id: auditLogs.id,
        timestamp: auditLogs.timestamp,
        entity: auditLogs.entity,
        entityId: auditLogs.entityId,
        action: auditLogs.action,
        details: auditLogs.details,
        changes: auditLogs.changes,
        ipAddress: auditLogs.ipAddress,
        name: sql`${users.firstName} || ' ' || ${users.lastName}`,
        role: companyRoles.name,
      })
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.userId, users.id))
      .innerJoin(companyRoles, eq(users.companyRoleId, companyRoles.id))
      .where(eq(users.companyId, companyId))
      .orderBy(desc(auditLogs.timestamp))
      .execute();
  }

  async getLoginAudit(companyId: string) {
    return this.db
      .select({
        id: auditLogs.id,
        timestamp: auditLogs.timestamp,
        entity: auditLogs.entity,
        entityId: auditLogs.entityId,
        action: auditLogs.action,
        details: auditLogs.details,
        changes: auditLogs.changes,
        ipAddress: auditLogs.ipAddress,
        name: sql`${users.firstName} || ' ' || ${users.lastName}`,
        role: companyRoles.name,
      })
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.userId, users.id))
      .innerJoin(companyRoles, eq(users.companyRoleId, companyRoles.id))
      .where(
        and(
          eq(users.companyId, companyId),
          eq(auditLogs.entity, 'Authentication'),
        ),
      )
      .orderBy(desc(auditLogs.timestamp))
      .execute();
  }
}
