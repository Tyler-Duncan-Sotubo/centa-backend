import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { AuditService } from 'src/modules/audit/audit.service';
import { TableConfig } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
export declare abstract class BaseCrudService<E, _T extends PgTable<TableConfig>> {
    protected db: NodePgDatabase<any>;
    protected audit: AuditService;
    protected abstract table: PgTable<TableConfig>;
    constructor(db: NodePgDatabase<any>, audit: AuditService);
    protected updateWithAudit(companyId: string, id: string, dto: Partial<E>, auditMeta: {
        entity: string;
        action: string;
        fields: (keyof E)[];
    }, userId: string, ip: string): Promise<{
        id: any;
    }>;
}
