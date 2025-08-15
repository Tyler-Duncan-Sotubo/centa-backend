import { LeavePolicyService } from '../policy/leave-policy.service';
import { LeaveBalanceService } from './leave-balance.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { CompanyService } from 'src/modules/core/company/company.service';
import { db } from 'src/drizzle/types/drizzle';
export declare class LeaveAccrualCronService {
    private readonly leavePolicyService;
    private readonly leaveBalanceService;
    private readonly auditService;
    private readonly companyService;
    private readonly db;
    private readonly logger;
    constructor(leavePolicyService: LeavePolicyService, leaveBalanceService: LeaveBalanceService, auditService: AuditService, companyService: CompanyService, db: db);
    handleMonthlyLeaveAccruals(): Promise<void>;
    handleNonAccrualBalanceSetup(): Promise<void>;
}
