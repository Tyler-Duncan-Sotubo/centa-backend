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
var ReservedDaysService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReservedDaysService = void 0;
const common_1 = require("@nestjs/common");
const reserved_day_schema_1 = require("./schema/reserved-day.schema");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const audit_service_1 = require("../../audit/audit.service");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../../drizzle/schema");
const leave_types_schema_1 = require("../schema/leave-types.schema");
const date_fns_1 = require("date-fns");
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../../common/cache/cache.service");
let ReservedDaysService = ReservedDaysService_1 = class ReservedDaysService {
    constructor(db, auditService, logger, cache) {
        this.db = db;
        this.auditService = auditService;
        this.logger = logger;
        this.cache = cache;
        this.logger.setContext(ReservedDaysService_1.name);
    }
    oneKey(id) {
        return `reserved:${id}:detail`;
    }
    listKey(companyId) {
        return `company:${companyId}:reserved:list`;
    }
    byEmployeeKey(companyId, employeeId) {
        return `company:${companyId}:reserved:emp:${employeeId}`;
    }
    datesKey(companyId, employeeId) {
        return `company:${companyId}:reserved:dates:${employeeId}`;
    }
    async burst(opts) {
        const jobs = [];
        if (opts.id)
            jobs.push(this.cache.del(this.oneKey(opts.id)));
        if (opts.companyId) {
            jobs.push(this.cache.del(this.listKey(opts.companyId)));
            if (opts.employeeId) {
                jobs.push(this.cache.del(this.byEmployeeKey(opts.companyId, opts.employeeId)));
                jobs.push(this.cache.del(this.datesKey(opts.companyId, opts.employeeId)));
            }
        }
        await Promise.allSettled(jobs);
        this.logger.debug({ ...opts }, 'cache:burst:reserved');
    }
    overlaps(aStart, aEnd, bStart, bEnd) {
        const aS = (0, date_fns_1.parseISO)(aStart);
        const aE = (0, date_fns_1.parseISO)(aEnd);
        const bS = (0, date_fns_1.parseISO)(bStart);
        const bE = (0, date_fns_1.parseISO)(bEnd);
        return aS <= bE && aE >= bS;
    }
    async create(dto, user) {
        this.logger.info({ companyId: user.companyId, dto }, 'reserved:create:start');
        const { startDate, endDate, employeeId } = dto;
        if ((0, date_fns_1.parseISO)(endDate) < (0, date_fns_1.parseISO)(startDate)) {
            this.logger.warn({ startDate, endDate }, 'reserved:create:invalid-range');
            throw new common_1.BadRequestException('endDate must be on or after startDate');
        }
        const [overlap] = await this.db
            .select({
            id: reserved_day_schema_1.reservedLeaveDays.id,
            startDate: reserved_day_schema_1.reservedLeaveDays.startDate,
            endDate: reserved_day_schema_1.reservedLeaveDays.endDate,
        })
            .from(reserved_day_schema_1.reservedLeaveDays)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(reserved_day_schema_1.reservedLeaveDays.companyId, user.companyId), (0, drizzle_orm_1.eq)(reserved_day_schema_1.reservedLeaveDays.employeeId, employeeId), (0, drizzle_orm_1.sql) `(${reserved_day_schema_1.reservedLeaveDays.startDate} <= ${endDate}) AND (${reserved_day_schema_1.reservedLeaveDays.endDate} >= ${startDate})`))
            .execute();
        if (overlap) {
            this.logger.warn({ companyId: user.companyId, overlap }, 'reserved:create:conflict');
            throw new common_1.BadRequestException('This date range overlaps with a reserved period.');
        }
        const [reservedDay] = await this.db
            .insert(reserved_day_schema_1.reservedLeaveDays)
            .values({
            employeeId: dto.employeeId,
            leaveTypeId: dto.leaveTypeId,
            startDate,
            endDate,
            reason: dto.reason,
            companyId: user.companyId,
            createdBy: user.id,
        })
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'create',
            entity: 'reservedLeaveDays',
            entityId: reservedDay.id,
            userId: user.id,
            details: 'Reserved day created',
            changes: {
                employeeId: dto.employeeId,
                leaveTypeId: dto.leaveTypeId,
                startDate,
                endDate,
                reason: dto.reason,
                companyId: user.companyId,
            },
        });
        await this.burst({ companyId: user.companyId, employeeId: dto.employeeId });
        this.logger.info({ id: reservedDay.id }, 'reserved:create:done');
        return reservedDay;
    }
    async getReservedDates(companyId, employeeId) {
        const key = this.datesKey(companyId, employeeId);
        this.logger.debug({ key, companyId, employeeId }, 'reserved:dates:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const reserved = await this.db
                .select({
                startDate: reserved_day_schema_1.reservedLeaveDays.startDate,
                endDate: reserved_day_schema_1.reservedLeaveDays.endDate,
            })
                .from(reserved_day_schema_1.reservedLeaveDays)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(reserved_day_schema_1.reservedLeaveDays.companyId, companyId), (0, drizzle_orm_1.eq)(reserved_day_schema_1.reservedLeaveDays.employeeId, employeeId)))
                .execute();
            const allDates = [];
            for (const entry of reserved) {
                const range = (0, date_fns_1.eachDayOfInterval)({
                    start: (0, date_fns_1.parseISO)(entry.startDate),
                    end: (0, date_fns_1.parseISO)(entry.endDate),
                });
                range.forEach((date) => allDates.push((0, date_fns_1.format)(date, 'yyyy-MM-dd')));
            }
            this.logger.debug({ companyId, employeeId, count: allDates.length }, 'reserved:dates:db:done');
            return allDates;
        });
    }
    async findAll(companyId) {
        const key = this.listKey(companyId);
        this.logger.debug({ key, companyId }, 'reserved:list:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const rows = await this.db
                .select({
                id: reserved_day_schema_1.reservedLeaveDays.id,
                startDate: reserved_day_schema_1.reservedLeaveDays.startDate,
                endDate: reserved_day_schema_1.reservedLeaveDays.endDate,
                createdAt: reserved_day_schema_1.reservedLeaveDays.createdAt,
                employeeName: (0, drizzle_orm_1.sql) `concat(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
                leaveType: leave_types_schema_1.leaveTypes.name,
                createdBy: (0, drizzle_orm_1.sql) `concat(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})`,
                reason: reserved_day_schema_1.reservedLeaveDays.reason,
                employeeId: reserved_day_schema_1.reservedLeaveDays.employeeId,
            })
                .from(reserved_day_schema_1.reservedLeaveDays)
                .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(reserved_day_schema_1.reservedLeaveDays.createdBy, schema_1.users.id))
                .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(reserved_day_schema_1.reservedLeaveDays.employeeId, schema_1.employees.id))
                .innerJoin(leave_types_schema_1.leaveTypes, (0, drizzle_orm_1.eq)(reserved_day_schema_1.reservedLeaveDays.leaveTypeId, leave_types_schema_1.leaveTypes.id))
                .where((0, drizzle_orm_1.eq)(reserved_day_schema_1.reservedLeaveDays.companyId, companyId))
                .execute();
            this.logger.debug({ companyId, count: rows.length }, 'reserved:list:db:done');
            return rows;
        });
    }
    async findByEmployee(companyId, employeeId) {
        const key = this.byEmployeeKey(companyId, employeeId);
        this.logger.debug({ key, companyId, employeeId }, 'reserved:byEmp:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const rows = await this.db
                .select()
                .from(reserved_day_schema_1.reservedLeaveDays)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(reserved_day_schema_1.reservedLeaveDays.companyId, companyId), (0, drizzle_orm_1.eq)(reserved_day_schema_1.reservedLeaveDays.employeeId, employeeId)))
                .execute();
            this.logger.debug({ companyId, employeeId, count: rows.length }, 'reserved:byEmp:db:done');
            return rows;
        });
    }
    async findOne(id, user) {
        const key = this.oneKey(id);
        this.logger.debug({ key, id, companyId: user.companyId }, 'reserved:findOne:cache:get');
        const row = await this.cache.getOrSetCache(key, async () => {
            const [res] = await this.db
                .select()
                .from(reserved_day_schema_1.reservedLeaveDays)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(reserved_day_schema_1.reservedLeaveDays.id, id), (0, drizzle_orm_1.eq)(reserved_day_schema_1.reservedLeaveDays.companyId, user.companyId)))
                .execute();
            return res ?? null;
        });
        if (!row) {
            this.logger.warn({ id, companyId: user.companyId }, 'reserved:findOne:not-found');
            throw new common_1.NotFoundException('Reserved day not found');
        }
        return row;
    }
    async update(id, dto, user) {
        this.logger.info({ id, companyId: user.companyId, dto }, 'reserved:update:start');
        const existing = await this.findOne(id, user);
        const newStart = dto.startDate ?? existing.startDate;
        const newEnd = dto.endDate ?? existing.endDate;
        const empId = dto.employeeId ?? existing.employeeId;
        if (!empId) {
            this.logger.warn({ empId }, 'reserved:update:missing-employeeId');
            throw new common_1.BadRequestException('employeeId is required for update');
        }
        if ((0, date_fns_1.parseISO)(newEnd) < (0, date_fns_1.parseISO)(newStart)) {
            this.logger.warn({ newStart, newEnd }, 'reserved:update:invalid-range');
            throw new common_1.BadRequestException('endDate must be on or after startDate');
        }
        const [conflict] = await this.db
            .select({
            id: reserved_day_schema_1.reservedLeaveDays.id,
            startDate: reserved_day_schema_1.reservedLeaveDays.startDate,
            endDate: reserved_day_schema_1.reservedLeaveDays.endDate,
        })
            .from(reserved_day_schema_1.reservedLeaveDays)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(reserved_day_schema_1.reservedLeaveDays.companyId, user.companyId), (0, drizzle_orm_1.eq)(reserved_day_schema_1.reservedLeaveDays.employeeId, empId), (0, drizzle_orm_1.sql) `${reserved_day_schema_1.reservedLeaveDays.id} <> ${id}`, (0, drizzle_orm_1.sql) `(${reserved_day_schema_1.reservedLeaveDays.startDate} <= ${newEnd}) AND (${reserved_day_schema_1.reservedLeaveDays.endDate} >= ${newStart})`))
            .execute();
        if (conflict) {
            this.logger.warn({ id, conflict }, 'reserved:update:conflict');
            throw new common_1.BadRequestException('Updated date range overlaps with an existing reserved period.');
        }
        const [updated] = await this.db
            .update(reserved_day_schema_1.reservedLeaveDays)
            .set({ ...dto })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(reserved_day_schema_1.reservedLeaveDays.id, id), (0, drizzle_orm_1.eq)(reserved_day_schema_1.reservedLeaveDays.companyId, user.companyId)))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'reservedLeaveDays',
            entityId: id,
            userId: user.id,
            details: 'Reserved day updated',
            changes: { ...dto },
        });
        await this.burst({ companyId: user.companyId, id, employeeId: empId });
        this.logger.info({ id }, 'reserved:update:done');
        return updated;
    }
    async remove(id, user) {
        this.logger.info({ id, companyId: user.companyId }, 'reserved:delete:start');
        const existing = await this.findOne(id, user);
        await this.db
            .delete(reserved_day_schema_1.reservedLeaveDays)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(reserved_day_schema_1.reservedLeaveDays.id, id), (0, drizzle_orm_1.eq)(reserved_day_schema_1.reservedLeaveDays.companyId, user.companyId)))
            .execute();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'reservedLeaveDays',
            entityId: id,
            userId: user.id,
            details: 'Reserved day deleted',
            changes: { id, companyId: user.companyId },
        });
        await this.burst({
            companyId: user.companyId,
            id,
            employeeId: existing.employeeId ?? undefined,
        });
        this.logger.info({ id }, 'reserved:delete:done');
        return { message: 'Reserved day deleted successfully' };
    }
};
exports.ReservedDaysService = ReservedDaysService;
exports.ReservedDaysService = ReservedDaysService = ReservedDaysService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], ReservedDaysService);
//# sourceMappingURL=reserved-days.service.js.map