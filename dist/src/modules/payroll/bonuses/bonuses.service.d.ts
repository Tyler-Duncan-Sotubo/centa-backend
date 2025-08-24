import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { CacheService } from 'src/common/cache/cache.service';
import { User } from 'src/common/types/user.type';
import { CreateBonusDto } from './dto/create-bonus.dto';
import { UpdateBonusDto } from './dto/update-bonus.dto';
export declare class BonusesService {
    private db;
    private auditService;
    private cache;
    constructor(db: db, auditService: AuditService, cache: CacheService);
    private getCompanyIdByBonusId;
    create(user: User, dto: CreateBonusDto): Promise<{
        status: string | null;
        id: string;
        createdAt: Date | null;
        companyId: string;
        createdBy: string;
        employeeId: string;
        effectiveDate: string;
        amount: string;
        bonusType: string;
    }[]>;
    findAll(companyId: string): Promise<({
        id: string;
        employee_id: string;
        amount: string;
        bonus_type: string;
        first_name: any;
        last_name: any;
        effective_date: string;
        status: string | null;
    } | {
        id: string;
        employee_id: string;
        amount: string;
        bonus_type: string;
        first_name: any;
        last_name: any;
        effective_date: string;
        status: string | null;
    })[]>;
    findOne(bonusId: string): Promise<{}[]>;
    findAllEmployeeBonuses(companyId: string, employee_id: string): Promise<{
        id: string;
        employee_id: string;
        amount: string;
        bonus_type: string;
        effective_date: string;
    }[]>;
    update(bonusId: string, dto: UpdateBonusDto, user: User): Promise<{
        id: string;
        companyId: string;
        employeeId: string;
        createdBy: string;
        amount: string;
        bonusType: string;
        effectiveDate: string;
        status: string | null;
        createdAt: Date | null;
    }>;
    remove(user: User, bonusId: string): Promise<{
        id: string;
        companyId: string;
        employeeId: string;
        createdBy: string;
        amount: string;
        bonusType: string;
        effectiveDate: string;
        status: string | null;
        createdAt: Date | null;
    }[]>;
}
