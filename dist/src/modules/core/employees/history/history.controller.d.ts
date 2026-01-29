import { HistoryService } from './history.service';
import { CreateHistoryDto } from './dto/create-history.dto';
import { UpdateHistoryDto } from './dto/update-history.dto';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class HistoryController extends BaseController {
    private readonly historyService;
    constructor(historyService: HistoryService);
    create(employeeId: string, dto: CreateHistoryDto, user: User, ip: string): Promise<{
        id: string;
        createdAt: Date;
        description: string | null;
        type: "employment" | "education" | "certification" | "promotion" | "transfer" | "termination";
        title: string;
        startDate: string | null;
        employeeId: string;
        endDate: string | null;
        institution: string | null;
    }>;
    findAll(id: string): Promise<{
        id: string;
        employeeId: string;
        type: "employment" | "education" | "certification" | "promotion" | "transfer" | "termination";
        title: string;
        startDate: string | null;
        endDate: string | null;
        institution: string | null;
        description: string | null;
        createdAt: Date;
    }[]>;
    findOne(id: string): Promise<{}>;
    update(id: string, dto: UpdateHistoryDto, user: User, ip: string): Promise<{
        id: string;
        employeeId: string;
        type: "employment" | "education" | "certification" | "promotion" | "transfer" | "termination";
        title: string;
        startDate: string | null;
        endDate: string | null;
        institution: string | null;
        description: string | null;
        createdAt: Date;
    }>;
    remove(id: string): Promise<{
        deleted: boolean;
        id: string;
    }>;
}
