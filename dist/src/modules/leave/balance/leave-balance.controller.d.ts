import { LeaveBalanceService } from './leave-balance.service';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { LeaveAccrualCronService } from './leave-accrual.cron';
export declare class LeaveBalanceController extends BaseController {
    private readonly leaveBalanceService;
    private readonly leaveAccrualCronService;
    constructor(leaveBalanceService: LeaveBalanceService, leaveAccrualCronService: LeaveAccrualCronService);
    handleMonthlyLeaveAccruals(): Promise<{
        message: string;
    }>;
    findAll(user: User): Promise<({
        employeeId: string;
        companyId: any;
        name: string;
        department: any;
        jobRole: string | null;
        totalBalance: string;
    } | {
        employeeId: string;
        companyId: any;
        name: string;
        department: any;
        jobRole: string | null;
        totalBalance: string;
    } | {
        employeeId: string;
        companyId: any;
        name: string;
        department: any;
        jobRole: string | null;
        totalBalance: string;
    } | {
        employeeId: string;
        companyId: any;
        name: string;
        department: any;
        jobRole: string | null;
        totalBalance: string;
    })[]>;
    findEmployeeLeaveBalance(user: User, employeeId: string): Promise<{
        leaveTypeId: string;
        leaveTypeName: string;
        year: number;
        entitlement: string;
        used: string;
        balance: string;
    }[]>;
}
