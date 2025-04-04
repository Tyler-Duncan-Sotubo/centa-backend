import { db } from 'src/drizzle/types/drizzle';
export declare class AuditService {
    private db;
    constructor(db: db);
    logAction(action: string, entity: string, userId: string): Promise<void>;
    getAuditLogs(company_id: string): Promise<any[]>;
}
