import { PaySchedulesService } from './pay-schedules.service';
import { CreatePayScheduleDto } from './dto/create-pay-schedule.dto';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class PaySchedulesController extends BaseController {
    private readonly paySchedulesService;
    constructor(paySchedulesService: PaySchedulesService);
    createPaySchedule(dto: CreatePayScheduleDto, user: User): Promise<{
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string;
        startDate: string;
        payFrequency: string;
        paySchedule: unknown;
        weekendAdjustment: string;
        holidayAdjustment: string;
        isDeleted: boolean | null;
    }[]>;
    listPaySchedules(user: User): Promise<{
        id: string;
        companyId: string;
        startDate: string;
        payFrequency: string;
        paySchedule: unknown;
        weekendAdjustment: string;
        holidayAdjustment: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        isDeleted: boolean | null;
    }[]>;
    findOne(scheduleId: string): Promise<{
        id: string;
        companyId: string;
        startDate: string;
        payFrequency: string;
        paySchedule: unknown;
        weekendAdjustment: string;
        holidayAdjustment: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        isDeleted: boolean | null;
    }>;
    getNextPayDate(user: User): Promise<Date | null>;
    getRawPaySchedules(user: User): Promise<{
        payFrequency: string;
        paySchedules: unknown;
        id: string;
    }[]>;
    updatePaySchedule(scheduleId: string, dto: CreatePayScheduleDto, user: User): Promise<string>;
    deletePaySchedule(scheduleId: string, user: User, ip: string): Promise<string>;
}
