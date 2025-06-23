import { CreateBenefitGroupDto } from './dto/create-benefit-group.dto';
import { UpdateBenefitGroupDto } from './dto/update-benefit-group.dto';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
export declare class BenefitGroupsService {
    private readonly db;
    private readonly auditService;
    constructor(db: db, auditService: AuditService);
    create(dto: CreateBenefitGroupDto, user: User): Promise<{
        id: string;
        name: string;
        createdAt: Date | null;
        companyId: string;
        description: string | null;
        rules: unknown;
    }>;
    findAll(companyId: string): Promise<{
        id: string;
        companyId: string;
        name: string;
        description: string | null;
        rules: unknown;
        createdAt: Date | null;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        companyId: string;
        name: string;
        description: string | null;
        rules: unknown;
        createdAt: Date | null;
    }[]>;
    update(id: string, dto: UpdateBenefitGroupDto, user: User): Promise<{
        id: string;
        companyId: string;
        name: string;
        description: string | null;
        rules: unknown;
        createdAt: Date | null;
    }>;
    remove(id: string, user: User): Promise<void>;
}
