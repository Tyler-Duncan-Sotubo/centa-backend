import { CostCentersService } from './cost-centers.service';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class CostCentersController extends BaseController {
    private readonly costCentersService;
    constructor(costCentersService: CostCentersService);
    create(createCostCenterDto: CreateCostCenterDto, user: User): Promise<{
        id: string;
    }>;
    bulkCreate(rows: any[], user: User): Promise<{
        id: string;
        code: string;
        name: string;
        budget: number;
    }[]>;
    findAll(user: User): Promise<{
        id: string;
        code: string;
        name: string;
        budget: number;
    }[]>;
    findOne(id: string, user: User): Promise<{
        id: string;
        code: string;
        name: string;
        budget: number;
    }>;
    update(id: string, updateCostCenterDto: UpdateCostCenterDto, user: User, ip: string): Promise<{
        id: any;
    }>;
    remove(id: string, user: User): Promise<{
        id: string;
    }>;
}
