"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HolidaysService = void 0;
const common_1 = require("@nestjs/common");
const holidays_schema_1 = require("../schema/holidays.schema");
const config_1 = require("@nestjs/config");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const axios_1 = require("axios");
const drizzle_orm_1 = require("drizzle-orm");
const create_holiday_dto_1 = require("./dto/create-holiday.dto");
const audit_service_1 = require("../../audit/audit.service");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
let HolidaysService = class HolidaysService {
    constructor(configService, auditService, db) {
        this.configService = configService;
        this.auditService = auditService;
        this.db = db;
    }
    async getPublicHolidaysForYear(year, countryCode) {
        const publicHolidays = [];
        const apiKey = this.configService.get('CALENDARIFIC_API_KEY');
        const url = `https://calendarific.com/api/v2/holidays?country=${countryCode}&year=${year}&api_key=${apiKey}`;
        try {
            const response = await axios_1.default.get(url);
            const holidays = response.data.response.holidays;
            holidays.forEach((holiday) => {
                const holidayDate = new Date(holiday.date.iso);
                publicHolidays.push({
                    date: holidayDate.toISOString().split('T')[0],
                    name: holiday.name,
                    type: holiday.primary_type,
                });
            });
        }
        catch (error) {
            console.error('Error fetching public holidays:', error);
        }
        return publicHolidays;
    }
    removeDuplicateDates(dates) {
        const seen = new Set();
        const result = [];
        for (const item of dates) {
            if (!seen.has(item.date)) {
                seen.add(item.date);
                result.push(item);
            }
        }
        return result;
    }
    async getNonWorkingDaysForYear(year, countryCode) {
        const nonWorkingDays = [];
        const publicHolidays = await this.getPublicHolidaysForYear(year, countryCode);
        publicHolidays.forEach((holiday) => {
            nonWorkingDays.push({
                date: holiday.date,
                name: holiday.name,
                type: holiday.type,
            });
        });
        const uniqueNonWorkingDays = this.removeDuplicateDates(nonWorkingDays.map((day) => ({ ...day, date: day.date })));
        return uniqueNonWorkingDays;
    }
    async insertHolidaysForCurrentYear(countryCode) {
        const currentYear = new Date().getFullYear();
        const allHolidays = await this.getNonWorkingDaysForYear(currentYear, countryCode);
        const existingHolidays = await this.db
            .select({ date: holidays_schema_1.holidays.date })
            .from(holidays_schema_1.holidays);
        const existingDates = new Set(existingHolidays.map((h) => h.date));
        const newHolidays = allHolidays.filter((holiday) => !existingDates.has(holiday.date));
        const countryCodeMap = {
            NG: 'Nigeria',
            US: 'United States',
            IN: 'India',
            GB: 'United Kingdom',
            CA: 'Canada',
        };
        if (newHolidays.length > 0) {
            await this.db.insert(holidays_schema_1.holidays).values(newHolidays.map((holiday) => ({
                name: holiday.name,
                date: holiday.date,
                type: holiday.type,
                countryCode: countryCode,
                country: countryCodeMap[countryCode] || 'Unknown',
                year: currentYear.toString(),
                source: 'system_default',
            })));
        }
        return 'Holidays for the current year have been inserted successfully.';
    }
    async getUpcomingPublicHolidays(countryCode, companyId) {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const upcomingHolidays = await this.db
            .select()
            .from(holidays_schema_1.holidays)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(holidays_schema_1.holidays.countryCode, countryCode), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.year, currentYear.toString()), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(holidays_schema_1.holidays.type, 'Public Holiday'), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.isWorkingDayOverride, true)), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(holidays_schema_1.holidays.companyId, companyId), (0, drizzle_orm_1.isNull)(holidays_schema_1.holidays.companyId))))
            .execute();
        const filteredHolidays = upcomingHolidays.filter((holiday) => {
            const holidayDate = new Date(holiday.date);
            return holidayDate > currentDate;
        });
        const nonWeekendHolidays = filteredHolidays.filter((holiday) => holiday.name !== 'Weekend');
        nonWeekendHolidays.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateA.getTime() - dateB.getTime();
        });
        return nonWeekendHolidays.map((holiday) => ({
            name: holiday.name,
            date: holiday.date,
            type: holiday.type,
        }));
    }
    async listHolidaysInRange(companyId, startDate, endDate) {
        return this.db
            .select()
            .from(holidays_schema_1.holidays)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(holidays_schema_1.holidays.companyId, companyId), (0, drizzle_orm_1.isNull)(holidays_schema_1.holidays.companyId)), (0, drizzle_orm_1.gte)(holidays_schema_1.holidays.date, startDate), (0, drizzle_orm_1.lte)(holidays_schema_1.holidays.date, endDate), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.type, 'Public Holiday'), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.isWorkingDayOverride, false)))
            .execute();
    }
    async bulkCreateHolidays(companyId, rows) {
        const dtos = [];
        for (const row of rows) {
            const dto = (0, class_transformer_1.plainToInstance)(create_holiday_dto_1.CreateHolidayDto, {
                name: row['Name'] || row['name'],
                date: row['Date'] || row['date'],
                year: row['Year'] || row['year'],
                type: row['Type'] || row['type'],
                country: row['Country'] || row['country'],
                countryCode: row['CountryCode'] || row['countryCode'],
            });
            const errs = await (0, class_validator_1.validate)(dto);
            if (errs.length) {
                throw new common_1.BadRequestException('Invalid data: ' + JSON.stringify(errs));
            }
            dtos.push(dto);
        }
        const inserted = await this.db.transaction(async (trx) => {
            const values = dtos.map((d) => ({
                companyId,
                name: d.name,
                date: d.date,
                year: d.year,
                type: d.type,
                country: d.country,
                countryCode: d.countryCode,
                isWorkingDayOverride: true,
            }));
            return trx.insert(holidays_schema_1.holidays).values(values).returning().execute();
        });
        return inserted;
    }
    async createHoliday(dto, user) {
        const { name, date, year, type } = dto;
        const existingHoliday = await this.db
            .select()
            .from(holidays_schema_1.holidays)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(holidays_schema_1.holidays.name, name), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.date, date), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.year, year), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.type, type), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.companyId, user.companyId)))
            .execute();
        if (existingHoliday.length > 0) {
            throw new Error('Holiday already exists');
        }
        const [holiday] = await this.db
            .insert(holidays_schema_1.holidays)
            .values({
            ...dto,
            companyId: user.companyId,
            isWorkingDayOverride: true,
            source: 'manual',
        })
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'create',
            entity: 'holiday',
            entityId: holiday.id,
            userId: user.id,
            details: 'Created new holiday',
            changes: {
                name: holiday.name,
                date: holiday.date,
                year: holiday.year,
                type: holiday.type,
                companyId: holiday.companyId,
                isWorkingDayOverride: holiday.isWorkingDayOverride,
                source: holiday.source,
            },
        });
        return holiday;
    }
    async findOne(id, user) {
        const holiday = await this.db
            .select()
            .from(holidays_schema_1.holidays)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(holidays_schema_1.holidays.id, id), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.companyId, user.companyId)))
            .execute();
        if (holiday.length === 0) {
            throw new Error('Holiday not found');
        }
    }
    async findAll(companyId) {
        const holidaysList = await this.db
            .select()
            .from(holidays_schema_1.holidays)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(holidays_schema_1.holidays.companyId, companyId), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.isWorkingDayOverride, true)))
            .orderBy((0, drizzle_orm_1.asc)(holidays_schema_1.holidays.date))
            .execute();
        return holidaysList;
    }
    async update(id, dto, user) {
        await this.findOne(id, user);
        const updatedHoliday = await this.db
            .update(holidays_schema_1.holidays)
            .set({
            ...dto,
            companyId: user.companyId,
            isWorkingDayOverride: true,
            source: 'manual',
        })
            .where((0, drizzle_orm_1.eq)(holidays_schema_1.holidays.id, id))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'holiday',
            details: 'Updated holiday',
            entityId: id,
            userId: user.id,
            changes: {
                ...dto,
                companyId: user.companyId,
                isWorkingDayOverride: true,
                source: 'manual',
            },
        });
        return updatedHoliday;
    }
    async delete(id, user) {
        await this.findOne(id, user);
        await this.db.delete(holidays_schema_1.holidays).where((0, drizzle_orm_1.eq)(holidays_schema_1.holidays.id, id)).execute();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'holiday',
            details: 'Deleted holiday',
            entityId: id,
            userId: user.id,
            changes: {
                id,
                companyId: user.companyId,
                isWorkingDayOverride: true,
                source: 'manual',
            },
        });
        return { message: 'Holiday deleted successfully' };
    }
};
exports.HolidaysService = HolidaysService;
exports.HolidaysService = HolidaysService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        audit_service_1.AuditService, Object])
], HolidaysService);
//# sourceMappingURL=holidays.service.js.map