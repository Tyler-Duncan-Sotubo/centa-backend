import { BlockedDaysService } from './blocked-days.service';
import { CreateBlockedDayDto } from './dto/create-blocked-day.dto';
import { UpdateBlockedDayDto } from './dto/update-blocked-day.dto';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class BlockedDaysController extends BaseController {
    private readonly blockedDaysService;
    constructor(blockedDaysService: BlockedDaysService);
    create(createBlockedDayDto: CreateBlockedDayDto, user: User): Promise<{
        name: string;
        date: string;
        id: string;
        createdAt: Date | null;
        companyId: string | null;
        createdBy: string;
        reason: string | null;
    }>;
    findAll(user: User): Promise<{
        id: string;
        date: string;
        reason: string | null;
        createdAt: Date | null;
        createdBy: string;
        name: string;
    }[]>;
    findOne(id: string, user: User): Promise<{
        id: string;
        companyId: string | null;
        name: string;
        date: string;
        reason: string | null;
        createdBy: string;
        createdAt: Date | null;
    }>;
    update(id: string, updateBlockedDayDto: UpdateBlockedDayDto, user: User): Promise<{
        id: string;
        companyId: string | null;
        name: string;
        date: string;
        reason: string | null;
        createdBy: string;
        createdAt: Date | null;
    }>;
    remove(id: string, user: User): Promise<{
        message: string;
    }>;
}
