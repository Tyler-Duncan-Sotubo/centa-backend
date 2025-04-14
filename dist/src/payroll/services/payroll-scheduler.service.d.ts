import { db } from 'src/drizzle/types/drizzle';
import { PayrollService } from './payroll.service';
export declare class PayrollSchedulerService {
    private readonly payrollService;
    private db;
    private readonly logger;
    constructor(payrollService: PayrollService, db: db);
    handlePayrollRun(): Promise<void>;
    private getPayrollMonth;
}
