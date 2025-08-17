import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
export declare class GoalsService {
    private readonly db;
    private readonly auditService;
    constructor(db: db, auditService: AuditService);
}
