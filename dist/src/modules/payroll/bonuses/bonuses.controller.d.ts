import { BonusesService } from './bonuses.service';
import { CreateBonusDto } from './dto/create-bonus.dto';
import { UpdateBonusDto } from './dto/update-bonus.dto';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class BonusesController extends BaseController {
    private readonly bonusesService;
    constructor(bonusesService: BonusesService);
    create(createBonusDto: CreateBonusDto, user: User): Promise<{
        id: string;
        createdAt: Date | null;
        companyId: string;
        employeeId: string;
        createdBy: string;
        amount: string;
        bonusType: string;
        effectiveDate: string;
        status: string | null;
    }[]>;
    findAll(user: User): Promise<({
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
    findEmployeeBonuses(employeeId: string, user: User): Promise<{
        id: string;
        employee_id: string;
        amount: string;
        bonus_type: string;
        effective_date: string;
    }[]>;
    update(bonusId: string, updateBonusDto: UpdateBonusDto, user: User): Promise<{
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
    remove(bonusId: string, user: User): Promise<{
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
