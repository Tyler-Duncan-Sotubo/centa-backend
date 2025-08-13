import { db } from 'src/drizzle/types/drizzle';
import { CreateAllowanceDto } from './dto/create-allowance.dto';
import { UpdateAllowanceDto } from './dto/update-allowance.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
export declare class AllowancesService {
    private readonly db;
    private readonly auditService;
    constructor(db: db, auditService: AuditService);
    create(dto: CreateAllowanceDto, user: User): Promise<{
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        payGroupId: string;
        allowanceType: string;
        percentage: string | null;
        valueType: string;
        fixedAmount: number | null;
    }>;
    findAll(payGroupId?: string): Promise<{
        id: string;
        payGroupId: string;
        allowanceType: string;
        valueType: string;
        percentage: string | null;
        fixedAmount: number | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        payGroupId: string;
        allowanceType: string;
        valueType: string;
        percentage: string | null;
        fixedAmount: number | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }>;
    update(id: string, dto: UpdateAllowanceDto, user: User): Promise<{
        message: string;
    }>;
    remove(id: string, user: User): Promise<{
        message: string;
    }>;
}
