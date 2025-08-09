import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class ExpensesController extends BaseController {
    private readonly expensesService;
    constructor(expensesService: ExpensesService);
    create(createExpenseDto: CreateExpenseDto, user: User): Promise<{
        date: string;
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string;
        category: string;
        employeeId: string;
        status: string;
        submittedAt: Date | null;
        amount: string;
        rejectionReason: string | null;
        purpose: string;
        receiptUrl: string | null;
        paymentMethod: string | null;
        deletedAt: Date | null;
    }>;
    bulkCreate(rows: any[], user: User): Promise<{
        insertedCount: number;
        inserted: {
            date: string;
            id: string;
            createdAt: Date | null;
            updatedAt: Date | null;
            companyId: string;
            category: string;
            employeeId: string;
            status: string;
            submittedAt: Date | null;
            amount: string;
            rejectionReason: string | null;
            purpose: string;
            receiptUrl: string | null;
            paymentMethod: string | null;
            deletedAt: Date | null;
        }[];
        errors: {
            index: number;
            name?: string;
            reason: string;
        }[];
    }>;
    findAll(user: User): Promise<({
        id: string;
        date: string;
        submittedAt: Date | null;
        category: string;
        purpose: string;
        amount: string;
        status: string;
        paymentMethod: string | null;
        receiptUrl: string | null;
        requester: string;
        employeeId: string;
        approvedBy: string;
    } | {
        id: string;
        date: string;
        submittedAt: Date | null;
        category: string;
        purpose: string;
        amount: string;
        status: string;
        paymentMethod: string | null;
        receiptUrl: string | null;
        requester: string;
        employeeId: string;
        approvedBy: string;
    })[]>;
    findOne(id: string): Promise<{
        id: string;
        companyId: string;
        employeeId: string;
        date: string;
        category: string;
        purpose: string;
        amount: string;
        status: string;
        submittedAt: Date | null;
        receiptUrl: string | null;
        paymentMethod: string | null;
        rejectionReason: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
        deletedAt: Date | null;
    }>;
    findByEmployee(id: string): Promise<{
        id: string;
        companyId: string;
        employeeId: string;
        date: string;
        category: string;
        purpose: string;
        amount: string;
        status: string;
        submittedAt: Date | null;
        receiptUrl: string | null;
        paymentMethod: string | null;
        rejectionReason: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
        deletedAt: Date | null;
    }[]>;
    update(id: string, updateExpenseDto: UpdateExpenseDto, user: User): Promise<{
        id: string;
        companyId: string;
        employeeId: string;
        date: string;
        category: string;
        purpose: string;
        amount: string;
        status: string;
        submittedAt: Date | null;
        receiptUrl: string | null;
        paymentMethod: string | null;
        rejectionReason: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
        deletedAt: Date | null;
    }>;
    getApprovalStatus(id: string): Promise<{
        expenseDate: string;
        approvalStatus: string;
        steps: {
            fallbackRoles: string[];
            isUserEligible: boolean;
            isFallback: boolean;
            id: string;
            sequence: number;
            role: string;
            minApprovals: number;
            maxApprovals: number;
            createdAt: Date | null;
            status: string;
        }[];
    }>;
    approveExpense(id: string, action: 'approved' | 'rejected', remarks: string, user: User): Promise<string>;
    remove(id: string, user: User): Promise<{
        success: boolean;
        id: string;
    }>;
    getReimbursementReport(user: User, filters: any): Promise<({
        id: string;
        date: string;
        submittedAt: Date | null;
        category: string;
        purpose: string;
        amount: string;
        status: string;
        paymentMethod: string | null;
        receiptUrl: string | null;
        requester: string;
        employeeId: string;
        approvedBy: string;
        approvalDate: Date | null;
    } | {
        id: string;
        date: string;
        submittedAt: Date | null;
        category: string;
        purpose: string;
        amount: string;
        status: string;
        paymentMethod: string | null;
        receiptUrl: string | null;
        requester: string;
        employeeId: string;
        approvedBy: string;
        approvalDate: Date | null;
    })[]>;
    exportReimbursementReport(user: User, filters: any, format?: 'csv' | 'excel'): Promise<{
        url: {
            url: string;
            record: any;
        } | undefined;
    }>;
}
