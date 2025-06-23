import { LeavePolicyService } from '../policy/leave-policy.service';
import { LeaveBalanceService } from './leave-balance.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { db } from 'src/drizzle/types/drizzle';
import { CompanyService } from 'src/modules/core/company/company.service';
export declare class LeaveAccrualCronService {
    private readonly leavePolicyService;
    private readonly leaveBalanceService;
    private readonly auditService;
    private readonly companyService;
    private readonly db;
    constructor(leavePolicyService: LeavePolicyService, leaveBalanceService: LeaveBalanceService, auditService: AuditService, companyService: CompanyService, db: db);
    handleMonthlyLeaveAccruals(): Promise<void>;
    handleNonAccrualBalanceSetup(): Promise<void>;
}
