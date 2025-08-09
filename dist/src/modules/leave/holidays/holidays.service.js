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
var HolidaysService_1;
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
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../../common/cache/cache.service");
let HolidaysService = HolidaysService_1 = class HolidaysService {
    constructor(configService, auditService, db, logger, cache) {
        this.configService = configService;
        this.auditService = auditService;
        this.db = db;
        this.logger = logger;
        this.cache = cache;
        this.logger.setContext(HolidaysService_1.name);
    }
    oneKey(id) {
        return `holiday:${id}:detail`;
    }
    listKey(companyId) {
        return `company:${companyId}:holidays:list`;
    }
    upcomingKey(companyId, cc, year) {
        return `company:${companyId}:holidays:upcoming:${cc}:${year}`;
    }
    rangeKey(companyId, start, end) {
        return `company:${companyId}:holidays:range:${start}:${end}`;
    }
    pubApiKey(cc, year) {
        return `pubhol:${cc}:${year}`;
    }
    async burst(opts) {
        const jobs = [];
        if (opts.id)
            jobs.push(this.cache.del(this.oneKey(opts.id)));
        if (opts.companyId) {
            jobs.push(this.cache.del(this.listKey(opts.companyId)));
            if (opts.countryCode && opts.year != null) {
                jobs.push(this.cache.del(this.upcomingKey(opts.companyId, opts.countryCode, opts.year)));
            }
            if (opts.range) {
                jobs.push(this.cache.del(this.rangeKey(opts.companyId, opts.range.start, opts.range.end)));
            }
        }
        await Promise.allSettled(jobs);
        this.logger.debug({ ...opts }, 'cache:burst:holidays');
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
    async getPublicHolidaysForYear(year, countryCode) {
        const apiKey = this.configService.get('CALENDARIFIC_API_KEY');
        const url = `https://calendarific.com/api/v2/holidays?country=${countryCode}&year=${year}&api_key=${apiKey}`;
        const cacheKey = this.pubApiKey(countryCode, year);
        this.logger.debug({ year, countryCode, cacheKey }, 'pubholidays:cache:get');
        return this.cache.getOrSetCache(cacheKey, async () => {
            try {
                const resp = await axios_1.default.get(url);
                const items = resp.data.response.holidays ?? [];
                const out = items.map((h) => ({
                    date: new Date(h.date.iso).toISOString().split('T')[0],
                    name: h.name,
                    type: h.primary_type,
                }));
                this.logger.debug({ year, countryCode, count: out.length }, 'pubholidays:api:ok');
                return out;
            }
            catch (error) {
                this.logger.error({ year, countryCode, err: error?.message }, 'pubholidays:api:error');
                return [];
            }
        });
    }
    async getNonWorkingDaysForYear(year, countryCode) {
        const publicHolidays = await this.getPublicHolidaysForYear(year, countryCode);
        const unique = this.removeDuplicateDates(publicHolidays.map((d) => ({ ...d })));
        return unique;
    }
    async insertHolidaysForCurrentYear(countryCode) {
        const currentYear = new Date().getFullYear();
        this.logger.info({ countryCode, currentYear }, 'insertHolidays:start');
        const allHolidays = await this.getNonWorkingDaysForYear(currentYear, countryCode);
        const existing = await this.db
            .select({ date: holidays_schema_1.holidays.date })
            .from(holidays_schema_1.holidays)
            .where((0, drizzle_orm_1.eq)(holidays_schema_1.holidays.year, String(currentYear)))
            .execute();
        const existingDates = new Set(existing.map((h) => h.date));
        const newRows = allHolidays.filter((h) => !existingDates.has(h.date));
        const countryCodeMap = {
            NG: 'Nigeria',
            US: 'United States',
            IN: 'India',
            GB: 'United Kingdom',
            CA: 'Canada',
        };
        if (newRows.length > 0) {
            await this.db
                .insert(holidays_schema_1.holidays)
                .values(newRows.map((h) => ({
                name: h.name,
                date: h.date,
                type: h.type,
                countryCode,
                country: countryCodeMap[countryCode] || 'Unknown',
                year: String(currentYear),
                source: 'system_default',
            })))
                .execute();
        }
        this.logger.info({ inserted: newRows.length }, 'insertHolidays:done');
        return 'Holidays for the current year have been inserted successfully.';
    }
    async getUpcomingPublicHolidays(countryCode, companyId) {
        const now = new Date();
        const year = now.getFullYear();
        const key = this.upcomingKey(companyId, countryCode, year);
        this.logger.debug({ key, companyId, countryCode, year }, 'upcoming:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const rows = await this.db
                .select()
                .from(holidays_schema_1.holidays)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(holidays_schema_1.holidays.countryCode, countryCode), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.year, String(year)), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(holidays_schema_1.holidays.type, 'Public Holiday'), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.isWorkingDayOverride, true)), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(holidays_schema_1.holidays.companyId, companyId), (0, drizzle_orm_1.isNull)(holidays_schema_1.holidays.companyId))))
                .execute();
            const out = rows
                .filter((h) => new Date(h.date) > now)
                .filter((h) => h.name !== 'Weekend')
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((h) => ({ name: h.name, date: h.date, type: h.type }));
            this.logger.debug({ companyId, count: out.length }, 'upcoming:db:done');
            return out;
        });
    }
    async listHolidaysInRange(companyId, startDate, endDate) {
        const key = this.rangeKey(companyId, startDate, endDate);
        this.logger.debug({ key, companyId, startDate, endDate }, 'range:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const res = await this.db
                .select()
                .from(holidays_schema_1.holidays)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(holidays_schema_1.holidays.companyId, companyId), (0, drizzle_orm_1.isNull)(holidays_schema_1.holidays.companyId)), (0, drizzle_orm_1.gte)(holidays_schema_1.holidays.date, startDate), (0, drizzle_orm_1.lte)(holidays_schema_1.holidays.date, endDate), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.type, 'Public Holiday'), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.isWorkingDayOverride, false)))
                .execute();
            this.logger.debug({ companyId, count: res.length }, 'range:db:done');
            return res;
        });
    }
    async bulkCreateHolidays(companyId, rows) {
        this.logger.info({ companyId, rows: rows?.length ?? 0 }, 'bulkCreate:start');
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
                this.logger.warn({ errs }, 'bulkCreate:validation-failed');
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
        await this.burst({ companyId });
        this.logger.info({ companyId, inserted: inserted.length }, 'bulkCreate:done');
        return inserted;
    }
    async createHoliday(dto, user) {
        this.logger.info({ companyId: user.companyId, dto }, 'create:start');
        const { name, date, year, type } = dto;
        const existing = await this.db
            .select({ id: holidays_schema_1.holidays.id })
            .from(holidays_schema_1.holidays)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(holidays_schema_1.holidays.name, name), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.date, date), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.year, year), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.type, type), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.companyId, user.companyId)))
            .execute();
        if (existing.length > 0) {
            this.logger.warn({ companyId: user.companyId, name, date }, 'create:duplicate');
            throw new common_1.BadRequestException('Holiday already exists');
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
        await this.burst({ companyId: user.companyId });
        this.logger.info({ id: holiday.id }, 'create:done');
        return holiday;
    }
    async findOne(id, user) {
        const key = this.oneKey(id);
        this.logger.debug({ key, id, companyId: user.companyId }, 'findOne:cache:get');
        const row = await this.cache.getOrSetCache(key, async () => {
            const [res] = await this.db
                .select()
                .from(holidays_schema_1.holidays)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(holidays_schema_1.holidays.id, id), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.companyId, user.companyId)))
                .execute();
            return res ?? null;
        });
        if (!row) {
            this.logger.warn({ id, companyId: user.companyId }, 'findOne:not-found');
            throw new common_1.NotFoundException('Holiday not found');
        }
        return row;
    }
    async findAll(companyId) {
        const key = this.listKey(companyId);
        this.logger.debug({ key, companyId }, 'findAll:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const rows = await this.db
                .select()
                .from(holidays_schema_1.holidays)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(holidays_schema_1.holidays.companyId, companyId), (0, drizzle_orm_1.eq)(holidays_schema_1.holidays.isWorkingDayOverride, true)))
                .orderBy((0, drizzle_orm_1.asc)(holidays_schema_1.holidays.date))
                .execute();
            this.logger.debug({ companyId, count: rows.length }, 'findAll:db:done');
            return rows;
        });
    }
    async update(id, dto, user) {
        this.logger.info({ id, companyId: user.companyId, dto }, 'update:start');
        await this.findOne(id, user);
        const [updated] = await this.db
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
        await this.burst({ companyId: user.companyId, id });
        this.logger.info({ id }, 'update:done');
        return updated;
    }
    async delete(id, user) {
        this.logger.info({ id, companyId: user.companyId }, 'delete:start');
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
        await this.burst({ companyId: user.companyId, id });
        this.logger.info({ id }, 'delete:done');
        return { message: 'Holiday deleted successfully' };
    }
};
exports.HolidaysService = HolidaysService;
exports.HolidaysService = HolidaysService = HolidaysService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        audit_service_1.AuditService, Object, nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], HolidaysService);
//# sourceMappingURL=holidays.service.js.map