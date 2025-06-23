// src/common/services/base-crud.service.ts
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { AuditService } from 'src/modules/audit/audit.service';
import { diffRecords } from 'src/utils/diff';
import { eq, and } from 'drizzle-orm';
import { TableConfig } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { NotFoundException } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export abstract class BaseCrudService<E, _T extends PgTable<TableConfig>> {
  protected abstract table: PgTable<TableConfig>;
  constructor(
    protected db: NodePgDatabase<any>,
    protected audit: AuditService,
  ) {}

  /**
   * Performs an update + audit on the given table.
   * @param companyId for multi-tenant scoping
   * @param id         record PK
   * @param dto        partial update payload
   * @param auditMeta  entity/action/fields config
   * @param userId     who’s making the change
   * @param ip         client IP
   */
  protected async updateWithAudit(
    companyId: string,
    id: string,
    dto: Partial<E>,
    auditMeta: { entity: string; action: string; fields: (keyof E)[] },
    userId: string,
    ip: string,
  ) {
    return this.db.transaction(async (trx) => {
      // 1) Load before
      const [before] = await trx
        .select()
        .from(this.table)
        .where(
          and(eq(this.table['companyId'], companyId), eq(this.table['id'], id)),
        )
        .execute();

      if (!before) {
        throw new NotFoundException(`${auditMeta.entity} ${id} not found`);
      }

      // 2) Update + returning after
      const [after] = await trx
        .update(this.table)
        .set(dto as any)
        .where(
          and(eq(this.table['companyId'], companyId), eq(this.table['id'], id)),
        )
        .returning({
          id: this.table['id'],
          ...Object.fromEntries(
            auditMeta.fields.map((field) => [
              field as string,
              this.table[field as unknown as string],
            ]),
          ),
        })
        .execute();

      // 3) Diff
      const changes = diffRecords(
        before as any,
        after as any,
        auditMeta.fields as string[],
      );

      // 4) If there are changes, log them
      if (!Object.keys(changes).length) {
        return after;
      }

      // 4) Audit
      await this.audit.logAction({
        entity: auditMeta.entity,
        action: auditMeta.action,
        userId,
        entityId: id,
        ipAddress: ip,
        changes,
      });

      return after;
    });
  }
}
