import { Injectable, Inject } from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from '../drizzle/drizzle.module';
import { auditLog } from 'src/drizzle/schema/audit.schema';
import { desc, eq } from 'drizzle-orm';
import { users } from 'src/drizzle/schema/users.schema';

@Injectable()
export class AuditService {
  constructor(@Inject(DRIZZLE) private db: db) {}

  async logAction(
    action: string,
    entity: string,
    userId: string,
  ): Promise<void> {
    await this.db.insert(auditLog).values({
      action,
      entity,
      userId: userId,
    });
  }

  async getAuditLogs(company_id: string): Promise<any[]> {
    const logs = await this.db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        entity: auditLog.entity,
        createdAt: auditLog.createdAt,
        changedBy: users.first_name,
        role: users.role,
      })
      .from(auditLog)
      .leftJoin(users, eq(auditLog.userId, users.id))
      .where(eq(users.company_id, company_id))
      .orderBy(desc(auditLog.createdAt));

    return logs;
  }
}
