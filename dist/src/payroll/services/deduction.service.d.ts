import { db } from 'src/drizzle/types/drizzle';
import { CreateCustomDeduction, UpdateCustomDeductionDto } from '../dto';
import { CacheService } from 'src/config/cache/cache.service';
import { updateTaxConfigurationDto } from '../dto/update-tax-config.dto';
export declare class DeductionService {
    private db;
    private cache;
    constructor(db: db, cache: CacheService);
    private getCompany;
    updateTaxConfiguration(company_id: string, dto: updateTaxConfigurationDto): Promise<any>;
    createCustomDeduction(user_id: string, dto: CreateCustomDeduction): Promise<any>;
    fetchCustomDeduction(user_id: string): Promise<{
        id: string;
        deduction_name: string;
        amount: number;
        first_name: string | null;
        last_name: string | null;
        employee_id: string;
    }[]>;
    updateCustomDeduction(user_id: string, dto: UpdateCustomDeductionDto, id: string): Promise<any>;
    deleteCustomDeduction(id: string): Promise<any>;
}
