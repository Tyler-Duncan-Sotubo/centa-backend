import { HolidaysService } from './holidays.service';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { User } from 'src/common/types/user.type';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
export declare class HolidaysController extends BaseController {
    private readonly holidaysService;
    constructor(holidaysService: HolidaysService);
    getCustomHolidays(user: User): Promise<{
        id: string;
        companyId: string | null;
        name: string;
        date: string;
        year: string;
        type: string;
        country: string | null;
        countryCode: string | null;
        isWorkingDayOverride: boolean | null;
        source: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }[]>;
    getUpcomingPublicHolidays(user: User): Promise<{
        name: string;
        date: string;
        type: string;
    }[]>;
    bulkCreateLeavePolicies(rows: any[], user: User): Promise<{
        name: string;
        date: string;
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        country: string | null;
        companyId: string | null;
        type: string;
        year: string;
        source: string | null;
        countryCode: string | null;
        isWorkingDayOverride: boolean | null;
    }[]>;
    createCustomHolidays(dto: CreateHolidayDto, user: User): Promise<{
        name: string;
        date: string;
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        country: string | null;
        companyId: string | null;
        type: string;
        year: string;
        source: string | null;
        countryCode: string | null;
        isWorkingDayOverride: boolean | null;
    }>;
    updateHoliday(dto: UpdateHolidayDto, user: User, id: string): Promise<{
        id: string;
        companyId: string | null;
        name: string;
        date: string;
        year: string;
        type: string;
        country: string | null;
        countryCode: string | null;
        isWorkingDayOverride: boolean | null;
        source: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }[]>;
    deleteHoliday(user: User, id: string): Promise<{
        message: string;
    }>;
}
