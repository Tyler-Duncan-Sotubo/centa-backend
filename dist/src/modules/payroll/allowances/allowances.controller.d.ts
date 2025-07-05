import { AllowancesService } from './allowances.service';
import { CreateAllowanceDto } from './dto/create-allowance.dto';
import { UpdateAllowanceDto } from './dto/update-allowance.dto';
import { User } from 'src/common/types/user.type';
export declare class AllowancesController {
    private readonly allowancesService;
    constructor(allowancesService: AllowancesService);
    create(createAllowanceDto: CreateAllowanceDto, user: User): Promise<{
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        payGroupId: string;
        percentage: string | null;
        allowanceType: string;
        valueType: string;
        fixedAmount: number | null;
    }>;
    findAll(): Promise<{
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
    update(id: string, updateAllowanceDto: UpdateAllowanceDto, user: User): Promise<{
        message: string;
    }>;
    remove(id: string, user: User): Promise<{
        message: string;
    }>;
}
