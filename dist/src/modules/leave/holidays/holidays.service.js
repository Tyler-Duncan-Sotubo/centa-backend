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
const cache_service_1 = require("../../../common/cache/cache.service");
let HolidaysService = class HolidaysService {
    constructor(configService, auditService, db, cache) {
        this.configService = configService;
        this.auditService = auditService;
        this.db = db;
        this.cache = cache;
    }
    tags(companyId) {
        return [
            `company:${companyId}:holidays`,
            `company:${companyId}:holidays:list`,
            `company:${companyId}:holidays:range`,
            `company:${companyId}:holidays:upcoming`,
        ];
    }
    async fetchCalendarificHolidays(year, countryCode) {
        const apiKey = this.configService.get('CALENDARIFIC_API_KEY');
        if (!apiKey)
            return [];
        const key = [
            'public-holidays',
            'calendarific',
            countryCode,
            String(year),
        ].join(':');
        return this.cache.getOrSetCache(key, async () => {
            const url = `https://calendarific.com/api/v2/holidays?country=${countryCode}&year=${year}&api_key=${apiKey}`;
            try {
                const response = await axios_1.default.get(url);
                const items = response.data?.response?.holidays ?? [];
                return items.map((h) => ({
                    date: new Date(h.date.iso).toISOString().split('T')[0],
                    name: h.name,
                    type: h.primary_type,
                }));
            }
            catch (error) {
                console.error('Error fetching public holidays:', error);
                return [];
            }
        });
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
        const publicHolidays = await this.fetchCalendarificHolidays(year, countryCode);
        publicHolidays.forEach((holiday) => {
            nonWorkingDays.push({
                date: holiday.date,
                name: holiday.name,
                type: holiday.type,
            });
        });
        return this.removeDuplicateDates(nonWorkingDays);
    }
    async insertHolidaysForCurrentYear(countryCode, companyId) {
        const currentYear = new Date().getFullYear();
        const allHolidays = await this.getNonWorkingDaysForYear(currentYear, countryCode);
        const existing = await this.db
            .select({ date: holidays_schema_1.holidays.date })
            .from(holidays_schema_1.holidays);
        const existingDates = new Set(existing.map((h) => h.date));
        const newHolidays = allHolidays.filter((h) => !existingDates.has(h.date));
        const countryCodeMap = {
            NG: 'Nigeria',
            US: 'United States',
            IN: 'India',
            GB: 'United Kingdom',
            CA: 'Canada',
        };
        if (newHolidays.length > 0) {
            await this.db
                .insert(holidays_schema_1.holidays)
                .values(newHolidays.map((h) => ({
                name: h.name,
                date: h.date,
                type: h.type,
                countryCode,
                country: countryCodeMap[countryCode] || 'Unknown',
                year: String(currentYear),
                source: 'system_default',
                companyId: null,
                isWorkingDayOverride: false,
            })))
                .execute();
        }
        if (companyId) {
            await this.cache.bumpCompanyVersion(companyId);
        }
        return 'Holidays for the current year have been inserted successfully.';
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
                source: 'manual',
            }));
            return trx.insert(holidays_schema_1.holidays).values(values).returning().execute();
        });
        await this.cache.bumpCompanyVersion(companyId);
        return inserted;
    }
    async createHolidaysBulk(dtos, user) {
        if (!dtos?.length)
            return [];
        const companyId = user?.companyId;
        const source = user ? 'manual' : 'system_default';
        const makeKey = (d) => `${d.name}__${d.date}__${d.year}__${d.type}__${companyId ?? 'null'}`;
        const uniqueMap = new Map();
        for (const dto of dtos)
            uniqueMap.set(makeKey(dto), dto);
        const uniqueDtos = [...uniqueMap.values()];
        const names = [...new Set(uniqueDtos.map((d) => d.name))];
        const years = [...new Set(uniqueDtos.map((d) => d.year))];
        const candidates = await this.db
            .select({
            id: holidays_schema_1.holidays.id,
            name: holidays_schema_1.holidays.name,
            date: holidays_schema_1.holidays.date,
            year: holidays_schema_1.holidays.year,
            type: holidays_schema_1.holidays.type,
            companyId: holidays_schema_1.holidays.companyId,
        })
            .from(holidays_schema_1.holidays)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(holidays_schema_1.holidays.name, names), (0, drizzle_orm_1.inArray)(holidays_schema_1.holidays.year, years), companyId ? (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.companyId, companyId) : undefined))
            .execute();
        const existingKeys = new Set(candidates.map((r) => `${r.name}__${r.date}__${r.year}__${r.type}__${companyId ?? 'null'}`));
        const toInsert = uniqueDtos.filter((d) => !existingKeys.has(makeKey(d)));
        if (!toInsert.length)
            return [];
        const inserted = await this.db
            .insert(holidays_schema_1.holidays)
            .values(toInsert.map((dto) => ({
            ...dto,
            companyId,
            isWorkingDayOverride: true,
            source,
        })))
            .returning()
            .execute();
        if (user) {
            await this.auditService.logAction({
                action: 'create_bulk',
                entity: 'holiday',
                entityId: null,
                userId: user.id,
                details: `Created ${inserted.length} holidays`,
                changes: {
                    count: inserted.length,
                    holidayIds: inserted.map((h) => h.id),
                    source,
                    companyId,
                },
            });
            await this.cache.bumpCompanyVersion(user.companyId);
        }
        return inserted;
    }
    async createHoliday(dto, user) {
        const { name, date, year, type } = dto;
        const companyId = user?.companyId;
        const source = user ? 'manual' : 'system_default';
        const existing = await this.db
            .select()
            .from(holidays_schema_1.holidays)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(holidays_schema_1.holidays.name, name), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.date, date), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.year, year), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.type, type), companyId ? (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.companyId, companyId) : undefined))
            .execute();
        if (existing.length > 0) {
            throw new Error('Holiday already exists');
        }
        const [holiday] = await this.db
            .insert(holidays_schema_1.holidays)
            .values({
            ...dto,
            companyId,
            isWorkingDayOverride: true,
            source,
        })
            .returning()
            .execute();
        if (user) {
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
            await this.cache.bumpCompanyVersion(user.companyId);
        }
        return holiday;
    }
    async update(id, dto, user) {
        const found = await this.db
            .select()
            .from(holidays_schema_1.holidays)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(holidays_schema_1.holidays.id, id), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.companyId, user.companyId)))
            .execute();
        if (found.length === 0)
            throw new common_1.NotFoundException('Holiday not found');
        const updated = await this.db
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
        await this.cache.bumpCompanyVersion(user.companyId);
        return updated;
    }
    async delete(id, user) {
        const found = await this.db
            .select()
            .from(holidays_schema_1.holidays)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(holidays_schema_1.holidays.id, id), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.companyId, user.companyId)))
            .execute();
        if (found.length === 0)
            throw new common_1.NotFoundException('Holiday not found');
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
        await this.cache.bumpCompanyVersion(user.companyId);
        return { message: 'Holiday deleted successfully' };
    }
    async findOne(id, user) {
        return this.cache.getOrSetVersioned(user.companyId, ['holidays', 'one', id], async () => {
            const rows = await this.db
                .select()
                .from(holidays_schema_1.holidays)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(holidays_schema_1.holidays.id, id), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.companyId, user.companyId)))
                .execute();
            if (rows.length === 0)
                throw new common_1.NotFoundException('Holiday not found');
            return rows[0];
        }, { tags: this.tags(user.companyId) });
    }
    async findAll(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['holidays', 'list'], async () => {
            return this.db
                .select()
                .from(holidays_schema_1.holidays)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(holidays_schema_1.holidays.companyId, companyId), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.isWorkingDayOverride, true)))
                .orderBy((0, drizzle_orm_1.asc)(holidays_schema_1.holidays.date))
                .execute();
        }, { tags: this.tags(companyId) });
    }
    async getUpcomingPublicHolidays(countryCode, companyId) {
        const now = new Date();
        return this.cache.getOrSetVersioned(companyId, ['holidays', 'upcoming', countryCode, String(now.getFullYear())], async () => {
            const currentYear = now.getFullYear();
            const upcoming = await this.db
                .select()
                .from(holidays_schema_1.holidays)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(holidays_schema_1.holidays.countryCode, countryCode), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.year, currentYear.toString()), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(holidays_schema_1.holidays.type, 'Public Holiday'), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.isWorkingDayOverride, true)), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(holidays_schema_1.holidays.companyId, companyId), (0, drizzle_orm_1.isNull)(holidays_schema_1.holidays.companyId))))
                .execute();
            const filtered = upcoming
                .filter((h) => new Date(h.date) > now)
                .filter((h) => h.name !== 'Weekend')
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            return filtered.map((h) => ({
                name: h.name,
                date: h.date,
                type: h.type,
            }));
        }, { tags: this.tags(companyId) });
    }
    async listHolidaysInRange(companyId, startDate, endDate) {
        return this.cache.getOrSetVersioned(companyId, ['holidays', 'range', startDate, endDate], async () => {
            return this.db
                .select()
                .from(holidays_schema_1.holidays)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(holidays_schema_1.holidays.companyId, companyId), (0, drizzle_orm_1.isNull)(holidays_schema_1.holidays.companyId)), (0, drizzle_orm_1.gte)(holidays_schema_1.holidays.date, startDate), (0, drizzle_orm_1.lte)(holidays_schema_1.holidays.date, endDate), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.type, 'Public Holiday'), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.isWorkingDayOverride, false)))
                .execute();
        }, { tags: this.tags(companyId) });
    }
};
exports.HolidaysService = HolidaysService;
exports.HolidaysService = HolidaysService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        audit_service_1.AuditService, Object, cache_service_1.CacheService])
], HolidaysService);
//# sourceMappingURL=holidays.service.js.map