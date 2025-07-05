import { FinanceService } from './finance.service';
import { CreateFinanceDto } from './dto/create-finance.dto';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class FinanceController extends BaseController {
    private readonly financeService;
    constructor(financeService: FinanceService);
    create(employeeId: string, dto: CreateFinanceDto, user: User, ip: string): Promise<{
        createdAt: Date;
        updatedAt: Date;
        currency: string | null;
        employeeId: string;
        bankName: string | null;
        bankAccountNumber: string | null;
        bankAccountName: string | null;
        bankBranch: string | null;
        tin: string | null;
        pensionPin: string | null;
        nhfNumber: string | null;
    }>;
    findOne(id: string): Promise<{}>;
    remove(id: string): Promise<{
        deleted: boolean;
        id: string;
    }>;
    verifyAccount(accountNumber: string, bankCode: string): Promise<unknown>;
}
