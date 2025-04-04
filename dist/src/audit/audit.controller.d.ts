import { AuditService } from './audit.service';
import { User } from 'src/types/user.type';
import { BaseController } from 'src/config/base.controller';
export declare class AuditController extends BaseController {
    private readonly auditService;
    constructor(auditService: AuditService);
    getAuditLogs(user: User): Promise<any[]>;
}
