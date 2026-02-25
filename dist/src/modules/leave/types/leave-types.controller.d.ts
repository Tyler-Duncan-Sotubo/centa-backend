import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto';
import { LeaveTypesService } from './leave-types.service';
export declare class LeaveTypesController extends BaseController {
    private readonly leaveType;
    constructor(leaveType: LeaveTypesService);
    create(dto: CreateLeaveTypeDto, user: User, ip: string): Promise<{
        name: string;
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string;
        isPaid: boolean | null;
        colorTag: string | null;
    }>;
    bulkCreateLeaveTypes(rows: any[], user: User): Promise<{
        id: string;
        name: string;
        isPaid: boolean | null;
        colorTag: string | null;
    }[]>;
    findAll(user: User): Promise<{
        id: string;
        name: string;
        isPaid: boolean | null;
        colorTag: string | null;
        companyId: string;
        createdAt: Date | null;
        updatedAt: Date | null;
    }[]>;
    findOne(id: string, user: User): Promise<{
        id: string;
        name: string;
        isPaid: boolean | null;
        colorTag: string | null;
        companyId: string;
        createdAt: Date | null;
        updatedAt: Date | null;
    }>;
    update(id: string, dto: UpdateLeaveTypeDto, user: User, ip: string): Promise<{
        id: string;
        name: string;
        isPaid: boolean | null;
        colorTag: string | null;
        companyId: string;
        createdAt: Date | null;
        updatedAt: Date | null;
    }>;
    remove(id: string, user: User): Promise<{
        success: boolean;
        message: string;
    }>;
}
