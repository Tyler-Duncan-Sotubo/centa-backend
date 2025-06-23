import { db } from 'src/drizzle/types/drizzle';
export declare class AuditService {
    private db;
    constructor(db: db);
    logAction(params: {
        action: string;
        entity: string;
        userId: string;
        entityId?: string;
        details?: string;
        changes?: any;
        ipAddress?: string;
        correlationId?: string;
    }): Promise<void>;
    bulkLogActions(entries: Array<{
        action: string;
        entity: string;
        userId: string;
        entityId?: string;
        details?: string;
        changes?: any;
        ipAddress?: string;
        correlationId?: string;
    }>): Promise<void>;
    getAuditLogs(companyId: string): Promise<{
        id: string;
        timestamp: Date;
        entity: string;
        entityId: string | null;
        action: string;
        details: string | null;
        changes: unknown;
        ipAddress: string | null;
        name: unknown;
        role: string;
    }[]>;
    getLoginAudit(companyId: string): Promise<{
        id: string;
        timestamp: Date;
        entity: string;
        entityId: string | null;
        action: string;
        details: string | null;
        changes: unknown;
        ipAddress: string | null;
        name: unknown;
        role: string;
    }[]>;
}
