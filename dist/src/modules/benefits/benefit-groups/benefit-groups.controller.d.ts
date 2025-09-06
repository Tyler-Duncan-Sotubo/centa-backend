import { BenefitGroupsService } from './benefit-groups.service';
import { CreateBenefitGroupDto } from './dto/create-benefit-group.dto';
import { UpdateBenefitGroupDto } from './dto/update-benefit-group.dto';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class BenefitGroupsController extends BaseController {
    private readonly benefitGroupsService;
    constructor(benefitGroupsService: BenefitGroupsService);
    create(dto: CreateBenefitGroupDto, user: User): Promise<{
        id: string;
        name: string;
        createdAt: Date | null;
        companyId: string;
        description: string | null;
        teamId: string | null;
        rules: unknown;
    }>;
    findAll(user: User): Promise<{
        id: string;
        companyId: string;
        teamId: string | null;
        name: string;
        description: string | null;
        rules: unknown;
        createdAt: Date | null;
    }[]>;
    findOne(id: string, user: User): Promise<{
        id: string;
        companyId: string;
        teamId: string | null;
        name: string;
        description: string | null;
        rules: unknown;
        createdAt: Date | null;
    }>;
    update(id: string, dto: UpdateBenefitGroupDto, user: User): Promise<{
        id: string;
        companyId: string;
        teamId: string | null;
        name: string;
        description: string | null;
        rules: unknown;
        createdAt: Date | null;
    }>;
    remove(id: string, user: User): Promise<void>;
}
