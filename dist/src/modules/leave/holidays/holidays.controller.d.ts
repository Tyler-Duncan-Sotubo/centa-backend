import { HolidaysService } from './holidays.service';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { User } from 'src/common/types/user.type';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
export declare class HolidaysController extends BaseController {
    private readonly holidaysService;
    constructor(holidaysService: HolidaysService);
    getYearPublicHolidays(dto: CreateHolidayDto[]): Promise<{
        date: string;
        id: string;
        name: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        country: string | null;
        companyId: string | null;
        type: string;
        source: string | null;
        year: string;
        countryCode: string | null;
        isWorkingDayOverride: boolean | null;
    }[]>;
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
        date: string;
        id: string;
        name: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        country: string | null;
        companyId: string | null;
        type: string;
        source: string | null;
        year: string;
        countryCode: string | null;
        isWorkingDayOverride: boolean | null;
    }[]>;
    createCustomHolidays(dto: CreateHolidayDto, user: User): Promise<{
        date: string;
        id: string;
        name: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        country: string | null;
        companyId: string | null;
        type: string;
        source: string | null;
        year: string;
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
