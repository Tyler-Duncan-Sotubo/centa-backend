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
var EmployeeShiftsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeShiftsService = void 0;
const common_1 = require("@nestjs/common");
const nestjs_pino_1 = require("nestjs-pino");
const audit_service_1 = require("../../audit/audit.service");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const employee_shifts_schema_1 = require("../schema/employee-shifts.schema");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../audit/schema");
const schema_2 = require("../../../drizzle/schema");
const toCamelCase_1 = require("../../../utils/toCamelCase");
const cache_service_1 = require("../../../common/cache/cache.service");
let EmployeeShiftsService = EmployeeShiftsService_1 = class EmployeeShiftsService {
    constructor(auditService, db, logger, cache) {
        this.auditService = auditService;
        this.db = db;
        this.logger = logger;
        this.cache = cache;
        this.logger.setContext(EmployeeShiftsService_1.name);
    }
    listAllKey(companyId) {
        return `company:${companyId}:empShifts:listAll`;
    }
    listAllPagedKey(companyId, page, limit, search, shiftId) {
        return `company:${companyId}:empShifts:paged:p=${page}:l=${limit}:s=${search ?? ''}:sh=${shiftId ?? ''}`;
    }
    getOneKey(companyId, id) {
        return `company:${companyId}:empShifts:one:${id}`;
    }
    byEmployeeKey(companyId, employeeId) {
        return `company:${companyId}:empShifts:byEmployee:${employeeId}`;
    }
    byShiftKey(companyId, shiftId) {
        return `company:${companyId}:empShifts:byShift:${shiftId}`;
    }
    activeForDayKey(companyId, employeeId, date) {
        return `company:${companyId}:empShifts:active:${employeeId}:${date}`;
    }
    calendarKey(companyId, from, to) {
        return `company:${companyId}:empShifts:calendar:${from}:${to}`;
    }
    async delPrefix(prefix) {
        const anyCache = this.cache;
        if (typeof anyCache.delPrefix === 'function') {
            return anyCache.delPrefix(prefix);
        }
        return this.cache.del(prefix);
    }
    async burstAll(companyId, opts) {
        this.logger.debug({ companyId, opts }, 'cache.burstAll:start');
        const jobs = [];
        jobs.push(this.cache.del(this.listAllKey(companyId)));
        jobs.push(this.delPrefix(`company:${companyId}:empShifts:paged:`));
        jobs.push(this.delPrefix(`company:${companyId}:empShifts:calendar:`));
        if (opts?.ids?.length) {
            for (const id of opts.ids)
                jobs.push(this.cache.del(this.getOneKey(companyId, id)));
        }
        if (opts?.employeeIds?.length) {
            for (const e of opts.employeeIds)
                jobs.push(this.cache.del(this.byEmployeeKey(companyId, e)));
        }
        if (opts?.shiftIds?.length) {
            for (const s of opts.shiftIds)
                jobs.push(this.cache.del(this.byShiftKey(companyId, s)));
        }
        if (opts?.dates?.length && opts?.employeeIds?.length) {
            for (const e of opts.employeeIds) {
                for (const d of opts.dates)
                    jobs.push(this.cache.del(this.activeForDayKey(companyId, e, d)));
            }
        }
        await Promise.allSettled(jobs);
        this.logger.debug({ companyId }, 'cache.burstAll:done');
    }
    calendarVerKey(companyId) {
        return `company:${companyId}:empShifts:calendar:ver`;
    }
    async bumpCalendarVersion(companyId) {
        const anyCache = this.cache;
        if (typeof anyCache.incr === 'function') {
            await anyCache.incr(this.calendarVerKey(companyId));
        }
        else {
            await this.cache.set(this.calendarVerKey(companyId), Date.now().toString());
        }
    }
    async getCalendarVersion(companyId) {
        const v = await this.cache.get(this.calendarVerKey(companyId));
        if (v)
            return String(v);
        await this.bumpCalendarVersion(companyId);
        return String(await this.cache.get(this.calendarVerKey(companyId)));
    }
    baseEmployeeShiftQuery() {
        return this.db
            .select({
            id: employee_shifts_schema_1.employeeShifts.id,
            employeeId: employee_shifts_schema_1.employeeShifts.employeeId,
            shiftId: employee_shifts_schema_1.employeeShifts.shiftId,
            shiftDate: employee_shifts_schema_1.employeeShifts.shiftDate,
            employeeName: (0, drizzle_orm_1.sql) `CONCAT(${schema_2.employees.firstName}, ' ', ${schema_2.employees.lastName})`,
        })
            .from(employee_shifts_schema_1.employeeShifts)
            .leftJoin(schema_2.employees, (0, drizzle_orm_1.eq)(schema_2.employees.id, employee_shifts_schema_1.employeeShifts.employeeId));
    }
    async assertNoOverlap(companyId, employeeId, shiftDate) {
        this.logger.debug({ companyId, employeeId, shiftDate }, 'assertNoOverlap:check');
        const overlapping = await this.db
            .select()
            .from(employee_shifts_schema_1.employeeShifts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.companyId, companyId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.employeeId, employeeId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.shiftDate, shiftDate), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.isDeleted, false)))
            .execute();
        if (overlapping.length > 0) {
            this.logger.warn({ companyId, employeeId, shiftDate }, 'assertNoOverlap:found');
            throw new common_1.BadRequestException(`Employee ${employeeId} already has a shift assigned on ${shiftDate}`);
        }
    }
    async assignShift(employeeId, dto, user, ip) {
        this.logger.info({ employeeId, dto, companyId: user.companyId }, 'assignShift:start');
        const [employee] = await this.db
            .select()
            .from(schema_2.employees)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_2.employees.id, employeeId), (0, drizzle_orm_1.eq)(schema_2.employees.companyId, user.companyId)))
            .execute();
        if (!employee) {
            this.logger.warn({ employeeId }, 'assignShift:employee:not-found');
            throw new common_1.BadRequestException(`Employee ${employeeId} not found.`);
        }
        const [shift] = await this.db
            .select()
            .from(schema_2.shifts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_2.shifts.id, dto.shiftId), (0, drizzle_orm_1.eq)(schema_2.shifts.companyId, user.companyId)))
            .execute();
        if (!shift) {
            this.logger.warn({ shiftId: dto.shiftId }, 'assignShift:shift:not-found');
            throw new common_1.BadRequestException(`Shift ${dto.shiftId} not found.`);
        }
        if (shift.locationId && shift.locationId !== employee.locationId) {
            this.logger.warn({
                employeeLocationId: employee.locationId,
                shiftLocationId: shift.locationId,
            }, 'assignShift:location:mismatch');
            throw new common_1.BadRequestException(`Employee's location does not match shift location.`);
        }
        await this.assertNoOverlap(user.companyId, employeeId, dto.shiftDate);
        const [rec] = await this.db
            .insert(employee_shifts_schema_1.employeeShifts)
            .values({
            companyId: user.companyId,
            employeeId,
            shiftId: dto.shiftId,
            shiftDate: dto.shiftDate,
        })
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'create',
            entity: 'employee shift',
            details: 'Created new employee shift assignment',
            entityId: rec.id,
            userId: user.id,
            ipAddress: ip,
            changes: { before: {}, after: rec },
        });
        await this.burstAll(user.companyId, {
            ids: [rec.id],
            employeeIds: [employeeId],
            shiftIds: [dto.shiftId],
            dates: [dto.shiftDate],
        });
        this.logger.info({ id: rec.id }, 'assignShift:done');
        return rec;
    }
    async updateShift(employeeShiftId, dto, user, ip) {
        this.logger.info({ employeeShiftId, dto, companyId: user.companyId }, 'updateShift:start');
        const [employeeShift] = await this.db
            .select()
            .from(employee_shifts_schema_1.employeeShifts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.companyId, user.companyId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.id, employeeShiftId)))
            .execute();
        if (!employeeShift) {
            this.logger.warn({ employeeShiftId }, 'updateShift:not-found');
            throw new common_1.NotFoundException(`Employee shift ${employeeShiftId} not found.`);
        }
        const [updatedRec] = await this.db
            .update(employee_shifts_schema_1.employeeShifts)
            .set({ shiftDate: dto.shiftDate })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.companyId, user.companyId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.id, employeeShiftId)))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'employee shift',
            entityId: employeeShift.id,
            details: 'Updated employee shift assignment',
            userId: user.id,
            ipAddress: ip,
            changes: { before: employeeShift, after: updatedRec },
        });
        await this.burstAll(user.companyId, {
            ids: [employeeShiftId],
            employeeIds: [employeeShift.employeeId],
            shiftIds: employeeShift.shiftId ? [employeeShift.shiftId] : [],
            dates: [employeeShift.shiftDate, dto.shiftDate].filter((d) => typeof d === 'string'),
        });
        await this.bumpCalendarVersion(user.companyId);
        const ver = await this.getCalendarVersion(user.companyId);
        this.logger.info({ id: employeeShiftId, calendarVer: ver }, 'updateShift:done');
        return { ...updatedRec, _calendarVersion: ver };
    }
    async bulkAssignMany(companyId, dtos, user, ip) {
        this.logger.info({ companyId, count: dtos.length }, 'bulkAssignMany:start');
        const shiftIds = [...new Set(dtos.map((d) => d.shiftId))];
        const shiftRecords = await this.db
            .select()
            .from(schema_2.shifts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_2.shifts.id, shiftIds), (0, drizzle_orm_1.eq)(schema_2.shifts.companyId, companyId)))
            .execute();
        const shiftMap = new Map(shiftRecords.map((s) => [s.id, s]));
        const employeeIds = [...new Set(dtos.map((d) => d.employeeId))];
        const employeeRecords = await this.db
            .select()
            .from(schema_2.employees)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_2.employees.id, employeeIds), (0, drizzle_orm_1.eq)(schema_2.employees.companyId, companyId)))
            .execute();
        const employeeMap = new Map(employeeRecords.map((e) => [e.id, e]));
        for (const dto of dtos) {
            const shift = shiftMap.get(dto.shiftId);
            const employee = employeeMap.get(dto.employeeId);
            if (!shift) {
                this.logger.warn({ shiftId: dto.shiftId }, 'bulkAssignMany:shift:not-found');
                throw new common_1.BadRequestException(`Shift ${dto.shiftId} not found.`);
            }
            if (!employee) {
                this.logger.warn({ employeeId: dto.employeeId }, 'bulkAssignMany:employee:not-found');
                throw new common_1.BadRequestException(`Employee ${dto.employeeId} not found.`);
            }
            if (shift.locationId && shift.locationId !== employee.locationId) {
                this.logger.warn({ employeeId: dto.employeeId, shiftId: dto.shiftId }, 'bulkAssignMany:location:mismatch');
                throw new common_1.BadRequestException(`Employee ${dto.employeeId} cannot be assigned to shift ${dto.shiftId} at different location.`);
            }
        }
        for (const { employeeId, shiftDate } of dtos) {
            await this.assertNoOverlap(companyId, employeeId, shiftDate);
        }
        const inserted = await this.db.transaction(async (trx) => {
            const now = new Date();
            const shiftRows = dtos.map((d) => ({
                companyId,
                employeeId: d.employeeId,
                shiftId: d.shiftId,
                shiftDate: d.shiftDate,
            }));
            const newShifts = await trx
                .insert(employee_shifts_schema_1.employeeShifts)
                .values(shiftRows)
                .returning()
                .execute();
            const auditRows = newShifts.map((rec) => ({
                action: 'employee-shift-assignment',
                entity: 'time.employee-shift',
                entityId: rec.id,
                userId: user.id,
                ipAddress: ip,
                changes: { before: {}, after: rec },
                createdAt: now,
            }));
            await trx.insert(schema_1.auditLogs).values(auditRows).execute();
            return newShifts;
        });
        await this.burstAll(companyId, {
            ids: inserted.map((r) => r.id),
            employeeIds: [...new Set(dtos.map((d) => d.employeeId))],
            shiftIds: [...new Set(dtos.map((d) => d.shiftId))],
            dates: [...new Set(dtos.map((d) => d.shiftDate))],
        });
        this.logger.info({ inserted: inserted.length }, 'bulkAssignMany:done');
        return inserted;
    }
    async removeAssignment(assignmentId, user, ip) {
        this.logger.info({ assignmentId, companyId: user.companyId }, 'removeAssignment:start');
        const existing = await this.db
            .select()
            .from(employee_shifts_schema_1.employeeShifts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.companyId, user.companyId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.id, assignmentId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.isDeleted, false)))
            .execute();
        if (existing.length === 0) {
            this.logger.warn({ assignmentId }, 'removeAssignment:not-found');
            throw new common_1.NotFoundException(`Assignment ${assignmentId} not found.`);
        }
        const [oldRec] = await this.db
            .update(employee_shifts_schema_1.employeeShifts)
            .set({ isDeleted: true })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.companyId, user.companyId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.id, assignmentId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.isDeleted, false)))
            .returning()
            .execute();
        await this.db
            .insert(schema_1.auditLogs)
            .values({
            action: 'delete',
            entity: 'employee-shift',
            entityId: assignmentId,
            details: 'Soft-deleted employee shift assignment',
            userId: user.id,
            ipAddress: ip,
            changes: { before: oldRec, after: { ...oldRec, isDeleted: true } },
        })
            .execute();
        await this.burstAll(user.companyId, {
            ids: [assignmentId],
            employeeIds: [oldRec.employeeId],
            shiftIds: oldRec.shiftId ? [oldRec.shiftId] : [],
            dates: [oldRec.shiftDate],
        });
        this.logger.info({ assignmentId }, 'removeAssignment:done');
        return { success: true };
    }
    async bulkRemoveAssignments(employeeIds, user, ip) {
        this.logger.info({ companyId: user.companyId, employeeIds }, 'bulkRemoveAssignments:start');
        const oldRecs = await this.db
            .update(employee_shifts_schema_1.employeeShifts)
            .set({ isDeleted: true })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.companyId, user.companyId), (0, drizzle_orm_1.inArray)(employee_shifts_schema_1.employeeShifts.employeeId, employeeIds), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.isDeleted, false)))
            .returning()
            .execute();
        if (oldRecs.length === 0) {
            this.logger.info({ removed: 0 }, 'bulkRemoveAssignments:done');
            return { success: true, removedCount: 0 };
        }
        const auditRows = oldRecs.map((rec) => ({
            action: 'delete',
            entity: 'employee shift',
            details: 'Soft-deleted employee shift assignment',
            entityId: rec.id,
            userId: user.id,
            ipAddress: ip,
            changes: { before: rec, after: { ...rec, isDeleted: true } },
        }));
        await this.db.insert(schema_1.auditLogs).values(auditRows).execute();
        const shiftIds = [
            ...new Set(oldRecs.map((r) => r.shiftId).filter(Boolean)),
        ];
        const dates = [
            ...new Set(oldRecs.map((r) => r.shiftDate).filter(Boolean)),
        ];
        await this.burstAll(user.companyId, {
            ids: oldRecs.map((r) => r.id),
            employeeIds,
            shiftIds,
            dates,
        });
        this.logger.info({ removed: oldRecs.length }, 'bulkRemoveAssignments:done');
        return { success: true, removedCount: oldRecs.length };
    }
    async listAll(companyId) {
        const key = this.listAllKey(companyId);
        this.logger.debug({ companyId, key }, 'listAll:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            this.logger.debug({ companyId }, 'listAll:db:query');
            return this.baseEmployeeShiftQuery()
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.companyId, companyId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.isDeleted, false)))
                .execute();
        });
    }
    async listAllPaginated(companyId, { page = 1, limit = 20, search, shiftId, }) {
        const key = this.listAllPagedKey(companyId, page, limit, search, shiftId);
        this.logger.debug({ companyId, page, limit, search, shiftId, key }, 'listAllPaginated:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const offset = (page - 1) * limit;
            const conditions = [
                (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.companyId, companyId),
                (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.isDeleted, false),
            ];
            if (search) {
                conditions.push((0, drizzle_orm_1.sql) `CONCAT(${schema_2.employees.firstName}, ' ', ${schema_2.employees.lastName}) ILIKE ${'%' + search + '%'}`);
            }
            if (shiftId)
                conditions.push((0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.shiftId, shiftId));
            this.logger.debug({ companyId, conditions }, 'listAllPaginated:db:data');
            const data = await this.baseEmployeeShiftQuery()
                .where((0, drizzle_orm_1.and)(...conditions))
                .limit(limit)
                .offset(offset)
                .execute();
            this.logger.debug({ companyId }, 'listAllPaginated:db:count');
            const [{ count }] = await this.db
                .select({ count: (0, drizzle_orm_1.sql) `COUNT(*)` })
                .from(employee_shifts_schema_1.employeeShifts)
                .leftJoin(schema_2.employees, (0, drizzle_orm_1.eq)(schema_2.employees.id, employee_shifts_schema_1.employeeShifts.employeeId))
                .where((0, drizzle_orm_1.and)(...conditions))
                .execute();
            return {
                data,
                pagination: {
                    total: Number(count),
                    page,
                    limit,
                    totalPages: Math.ceil(Number(count) / limit),
                },
            };
        });
    }
    async getOne(companyId, assignmentId) {
        const key = this.getOneKey(companyId, assignmentId);
        this.logger.debug({ companyId, assignmentId, key }, 'getOne:cache:get');
        const rec = await this.cache.getOrSetCache(key, async () => {
            const [row] = await this.baseEmployeeShiftQuery()
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.companyId, companyId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.id, assignmentId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.isDeleted, false)))
                .execute();
            return row ?? null;
        });
        if (!rec) {
            this.logger.warn({ companyId, assignmentId }, 'getOne:not-found');
            throw new common_1.NotFoundException(`Assignment ${assignmentId} not found`);
        }
        return rec;
    }
    async listByEmployee(companyId, employeeId) {
        const key = this.byEmployeeKey(companyId, employeeId);
        this.logger.debug({ companyId, employeeId, key }, 'listByEmployee:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            return this.baseEmployeeShiftQuery()
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.companyId, companyId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.employeeId, employeeId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.isDeleted, false)))
                .execute();
        });
    }
    async getActiveShiftForEmployee(employeeId, companyId, date) {
        const key = this.activeForDayKey(companyId, employeeId, date);
        this.logger.debug({ companyId, employeeId, date, key }, 'getActiveShiftForEmployee:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const [assignment] = await this.db
                .select({ shiftId: employee_shifts_schema_1.employeeShifts.shiftId })
                .from(employee_shifts_schema_1.employeeShifts)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.companyId, companyId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.employeeId, employeeId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.isDeleted, false), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.shiftDate, date)))
                .execute();
            if (!assignment)
                return null;
            const [shiftRow] = await this.db
                .select()
                .from(schema_2.shifts)
                .where((0, drizzle_orm_1.and)(assignment.shiftId ? (0, drizzle_orm_1.eq)(schema_2.shifts.id, assignment.shiftId) : (0, drizzle_orm_1.sql) `false`, (0, drizzle_orm_1.eq)(schema_2.shifts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_2.shifts.isDeleted, false)))
                .execute();
            return shiftRow || null;
        });
    }
    async listByShift(companyId, shiftId) {
        const key = this.byShiftKey(companyId, shiftId);
        this.logger.debug({ companyId, shiftId, key }, 'listByShift:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            return this.baseEmployeeShiftQuery()
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.companyId, companyId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.shiftId, shiftId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.isDeleted, false)))
                .execute();
        });
    }
    async getCalendarEvents(companyId, from, to) {
        const ver = await this.getCalendarVersion(companyId);
        const key = `${this.calendarKey(companyId, from, to)}:v=${ver}`;
        this.logger.debug({ companyId, from, to, key }, 'getCalendarEvents:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            this.logger.debug({ companyId, from, to }, 'getCalendarEvents:db:query');
            const assignments = await this.db
                .select({
                id: employee_shifts_schema_1.employeeShifts.id,
                employeeId: schema_2.employees.id,
                shiftId: employee_shifts_schema_1.employeeShifts.shiftId,
                shiftDate: employee_shifts_schema_1.employeeShifts.shiftDate,
                employeeName: (0, drizzle_orm_1.sql) `CONCAT(${schema_2.employees.firstName}, ' ', ${schema_2.employees.lastName})`,
                shiftName: schema_2.shifts.name,
                startTime: schema_2.shifts.startTime,
                endTime: schema_2.shifts.endTime,
                location: schema_2.companyLocations.name,
                locationId: schema_2.companyLocations.id,
                jobTitle: schema_2.jobRoles.title,
            })
                .from(schema_2.employees)
                .leftJoin(employee_shifts_schema_1.employeeShifts, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_2.employees.id, employee_shifts_schema_1.employeeShifts.employeeId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.companyId, companyId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.isDeleted, false), (0, drizzle_orm_1.gte)(employee_shifts_schema_1.employeeShifts.shiftDate, from), (0, drizzle_orm_1.lte)(employee_shifts_schema_1.employeeShifts.shiftDate, to)))
                .leftJoin(schema_2.shifts, (0, drizzle_orm_1.eq)(schema_2.shifts.id, employee_shifts_schema_1.employeeShifts.shiftId))
                .leftJoin(schema_2.companyLocations, (0, drizzle_orm_1.eq)(schema_2.companyLocations.id, schema_2.employees.locationId))
                .leftJoin(schema_2.jobRoles, (0, drizzle_orm_1.eq)(schema_2.jobRoles.id, schema_2.employees.jobRoleId))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_2.employees.companyId, companyId), (0, drizzle_orm_1.eq)(schema_2.employees.employmentStatus, 'active')))
                .execute();
            const groupedEvents = {};
            for (const a of assignments) {
                const location = a.location || 'Main Office';
                if (!groupedEvents[location])
                    groupedEvents[location] = [];
                if (!a.shiftId || !a.shiftDate) {
                    groupedEvents[location].push({
                        id: a.id || '',
                        date: '',
                        startTime: '',
                        endTime: '',
                        employeeId: a.employeeId,
                        shiftId: '',
                        shiftName: '',
                        employeeName: a.employeeName,
                        locationId: a.locationId || '',
                        jobTitle: a.jobTitle || '',
                    });
                    continue;
                }
                groupedEvents[location].push({
                    id: a.id || '',
                    date: a.shiftDate,
                    startTime: a.startTime ?? '',
                    endTime: a.endTime ?? '',
                    employeeId: a.employeeId,
                    shiftId: a.shiftId,
                    employeeName: a.employeeName,
                    locationId: a.locationId ?? '',
                    jobTitle: a.jobTitle ?? '',
                    shiftName: a.shiftName ?? '',
                });
            }
            const camelCasedGroupedEvents = {};
            for (const [location, events] of Object.entries(groupedEvents)) {
                const camelKey = (0, toCamelCase_1.toCamelCase)(location);
                camelCasedGroupedEvents[camelKey] = events;
            }
            await this.cache.set(key, camelCasedGroupedEvents);
            return camelCasedGroupedEvents;
        });
    }
};
exports.EmployeeShiftsService = EmployeeShiftsService;
exports.EmployeeShiftsService = EmployeeShiftsService = EmployeeShiftsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [audit_service_1.AuditService, Object, nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], EmployeeShiftsService);
//# sourceMappingURL=employee-shifts.service.js.map