import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
export declare class ShiftsController extends BaseController {
    private readonly shiftsService;
    constructor(shiftsService: ShiftsService);
    create(createShiftDto: CreateShiftDto, user: User, ip: string): Promise<{
        id: string;
        name: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string;
        locationId: string | null;
        startTime: string;
        endTime: string;
        workingDays: unknown;
        lateToleranceMinutes: number | null;
        allowEarlyClockIn: boolean | null;
        earlyClockInMinutes: number | null;
        allowLateClockOut: boolean | null;
        lateClockOutMinutes: number | null;
        notes: string | null;
        isDeleted: boolean | null;
    }>;
    bulkCreate(rows: any[], user: User): Promise<{
        id: string;
        name: string;
        startTime: string;
        endTime: string;
    }[]>;
    findAll(user: User): Promise<{
        id: string;
        name: string;
        startTime: string;
        endTime: string;
        workingDays: unknown;
        lateToleranceMinutes: number | null;
        allowEarlyClockIn: boolean | null;
        earlyClockInMinutes: number | null;
        allowLateClockOut: boolean | null;
        lateClockOutMinutes: number | null;
        locationName: string | null;
        locationId: string | null;
    }[]>;
    findOne(id: string, user: User): Promise<{
        id: string;
        companyId: string;
        locationId: string | null;
        name: string;
        startTime: string;
        endTime: string;
        workingDays: unknown;
        lateToleranceMinutes: number | null;
        allowEarlyClockIn: boolean | null;
        earlyClockInMinutes: number | null;
        allowLateClockOut: boolean | null;
        lateClockOutMinutes: number | null;
        notes: string | null;
        isDeleted: boolean | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }>;
    update(id: string, updateShiftDto: UpdateShiftDto, user: User, ip: string): Promise<{
        id: string;
        companyId: string;
        locationId: string | null;
        name: string;
        startTime: string;
        endTime: string;
        workingDays: unknown;
        lateToleranceMinutes: number | null;
        allowEarlyClockIn: boolean | null;
        earlyClockInMinutes: number | null;
        allowLateClockOut: boolean | null;
        lateClockOutMinutes: number | null;
        notes: string | null;
        isDeleted: boolean | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }>;
    remove(id: string, user: User): Promise<{
        success: boolean;
    }>;
}
