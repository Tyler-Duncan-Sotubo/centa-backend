import { ReservedDaysService } from './reserved-days.service';
import { CreateReservedDayDto } from './dto/create-reserved-day.dto';
import { UpdateReservedDayDto } from './dto/update-reserved-day.dto';
import { BaseController } from 'src/common/interceptor/base.controller';
import { User } from 'src/common/types/user.type';
export declare class ReservedDaysController extends BaseController {
    private readonly reservedDaysService;
    constructor(reservedDaysService: ReservedDaysService);
    create(createReservedDayDto: CreateReservedDayDto, user: User): Promise<{
        id: string;
        createdBy: string;
        createdAt: Date | null;
        companyId: string | null;
        startDate: string;
        employeeId: string | null;
        endDate: string;
        reason: string | null;
        leaveTypeId: string;
    }>;
    findAll(user: User): Promise<({
        id: string;
        startDate: string;
        endDate: string;
        createdAt: Date | null;
        employeeName: string;
        leaveType: string;
        createdBy: string;
        reason: string | null;
    } | {
        id: string;
        startDate: string;
        endDate: string;
        createdAt: Date | null;
        employeeName: string;
        leaveType: string;
        createdBy: string;
        reason: string | null;
    })[]>;
    findOne(id: string, user: User): Promise<{
        id: string;
        employeeId: string | null;
        companyId: string | null;
        leaveTypeId: string;
        createdBy: string;
        startDate: string;
        endDate: string;
        reason: string | null;
        createdAt: Date | null;
    }>;
    findByEmployee(id: string): Promise<{
        id: string;
        employeeId: string | null;
        companyId: string | null;
        leaveTypeId: string;
        createdBy: string;
        startDate: string;
        endDate: string;
        reason: string | null;
        createdAt: Date | null;
    }[]>;
    update(id: string, updateReservedDayDto: UpdateReservedDayDto, user: User): Promise<{
        id: string;
        employeeId: string | null;
        companyId: string | null;
        leaveTypeId: string;
        createdBy: string;
        startDate: string;
        endDate: string;
        reason: string | null;
        createdAt: Date | null;
    }>;
    remove(id: string, user: User): Promise<{
        message: string;
    }>;
}
