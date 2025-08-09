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
var ShiftsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShiftsService = void 0;
const common_1 = require("@nestjs/common");
const audit_service_1 = require("../../audit/audit.service");
const create_shift_dto_1 = require("./dto/create-shift.dto");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const shifts_schema_1 = require("../schema/shifts.schema");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const schema_1 = require("../../../drizzle/schema");
const cache_service_1 = require("../../../common/cache/cache.service");
const nestjs_pino_1 = require("nestjs-pino");
let ShiftsService = ShiftsService_1 = class ShiftsService {
    constructor(auditService, db, cache, logger) {
        this.auditService = auditService;
        this.db = db;
        this.cache = cache;
        this.logger = logger;
        this.VALID_DAYS = new Set([
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
            'sunday',
        ]);
        this.logger.setContext(ShiftsService_1.name);
    }
    listKey(companyId) {
        return `company:${companyId}:shifts:list`;
    }
    oneKey(shiftId) {
        return `shift:${shiftId}:detail`;
    }
    async invalidateAfterChange(opts) {
        const jobs = [this.cache.del(this.listKey(opts.companyId))];
        if (opts.shiftId)
            jobs.push(this.cache.del(this.oneKey(opts.shiftId)));
        await Promise.allSettled(jobs);
    }
    parseTime(input) {
        if (input == null)
            return undefined;
        if (typeof input === 'number') {
            const totalMinutes = Math.round(input * 24 * 60);
            const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
            const m = String(totalMinutes % 60).padStart(2, '0');
            return { hhmm: `${h}:${m}`, minutes: totalMinutes };
        }
        const trimmed = String(input).trim();
        if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
            const [hStr, mStr] = trimmed.split(':');
            const h = Number(hStr);
            const m = Number(mStr);
            if (h < 0 || h > 23 || m < 0 || m > 59)
                throw new common_1.BadRequestException(`Invalid time: ${input}`);
            return {
                hhmm: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
                minutes: h * 60 + m,
            };
        }
        if (/^\d{1,2}(\.\d+)?$/.test(trimmed)) {
            const hoursFloat = Number(trimmed);
            if (hoursFloat < 0 || hoursFloat >= 24)
                throw new common_1.BadRequestException(`Invalid time: ${input}`);
            const totalMinutes = Math.round(hoursFloat * 60);
            const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
            const m = String(totalMinutes % 60).padStart(2, '0');
            return { hhmm: `${h}:${m}`, minutes: totalMinutes };
        }
        throw new common_1.BadRequestException(`Unsupported time format: "${input}"`);
    }
    normalizeDays(raw) {
        if (raw == null)
            return [];
        let arr = raw;
        if (typeof raw === 'string') {
            try {
                arr = JSON.parse(raw);
            }
            catch {
                throw new common_1.BadRequestException(`Working days must be a JSON array, got: "${raw}"`);
            }
        }
        if (!Array.isArray(arr)) {
            throw new common_1.BadRequestException(`Working days must be an array`);
        }
        const out = arr.map((d) => String(d).toLowerCase().trim());
        for (const d of out) {
            if (!this.VALID_DAYS.has(d)) {
                throw new common_1.BadRequestException(`Invalid day "${d}". Use: ${[...this.VALID_DAYS].join(', ')}`);
            }
        }
        return out;
    }
    validateTimes(start, end) {
        if (!start || !end) {
            throw new common_1.BadRequestException(`startTime and endTime are required`);
        }
        const duration = (end.minutes - start.minutes + 24 * 60) % (24 * 60);
        if (duration === 0) {
            throw new common_1.BadRequestException(`startTime and endTime cannot be identical`);
        }
    }
    async ensureUniqueName(companyId, name, excludeId) {
        const rows = await this.db
            .select({ id: shifts_schema_1.shifts.id })
            .from(shifts_schema_1.shifts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(shifts_schema_1.shifts.companyId, companyId), (0, drizzle_orm_1.eq)(shifts_schema_1.shifts.name, name), (0, drizzle_orm_1.eq)(shifts_schema_1.shifts.isDeleted, false), excludeId ? (0, drizzle_orm_1.not)((0, drizzle_orm_1.eq)(shifts_schema_1.shifts.id, excludeId)) : (0, drizzle_orm_1.sql) `TRUE`))
            .execute();
        if (rows.length > 0) {
            throw new common_1.BadRequestException(`Shift name "${name}" already exists`);
        }
    }
    async ensureLocationBelongs(companyId, locationId) {
        if (!locationId)
            return;
        const [loc] = await this.db
            .select({ id: schema_1.companyLocations.id })
            .from(schema_1.companyLocations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.companyLocations.id, locationId), (0, drizzle_orm_1.eq)(schema_1.companyLocations.companyId, companyId)))
            .execute();
        if (!loc) {
            throw new common_1.BadRequestException(`Location does not belong to this company`);
        }
    }
    async bulkCreate(companyId, rows) {
        const t0 = Date.now();
        this.logger.info({ companyId, rows: rows?.length ?? 0 }, 'shifts.bulk:start');
        if (!Array.isArray(rows) || rows.length === 0) {
            this.logger.warn({ companyId }, 'shifts.bulk:empty-input');
            throw new common_1.BadRequestException('No rows provided');
        }
        const firstKeys = Object.keys(rows[0] ?? {});
        this.logger.debug({ firstKeys }, 'shifts.bulk:first-row-keys');
        const locationRows = await this.db
            .select({ id: schema_1.companyLocations.id, name: schema_1.companyLocations.name })
            .from(schema_1.companyLocations)
            .where((0, drizzle_orm_1.eq)(schema_1.companyLocations.companyId, companyId))
            .execute();
        this.logger.debug({ count: locationRows.length, sample: locationRows.slice(0, 5) }, 'shifts.bulk:locations-loaded');
        const locationMap = new Map(locationRows.map((l) => [l.name.toLowerCase().trim(), l.id]));
        const inputNames = rows.map((r) => (r['Name'] ?? r['name'] ?? '').toString().trim());
        const dupInFile = inputNames.filter((n, i) => n && inputNames.indexOf(n) !== i);
        if (dupInFile.length) {
            this.logger.warn({ dupes: [...new Set(dupInFile)] }, 'shifts.bulk:dupes-in-file');
            throw new common_1.BadRequestException(`Duplicate shift names in file: ${[...new Set(dupInFile)].join(', ')}`);
        }
        if (inputNames.length) {
            const existing = await this.db
                .select({ name: shifts_schema_1.shifts.name })
                .from(shifts_schema_1.shifts)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(shifts_schema_1.shifts.companyId, companyId), (0, drizzle_orm_1.eq)(shifts_schema_1.shifts.isDeleted, false), (0, drizzle_orm_1.inArray)(shifts_schema_1.shifts.name, inputNames)))
                .execute();
            if (existing.length) {
                const msg = `Shift names already exist: ${existing.map((e) => e.name).join(', ')}`;
                this.logger.warn({ existing }, 'shifts.bulk:dupes-in-db');
                throw new common_1.BadRequestException(msg);
            }
        }
        const valid = [];
        const errors = [];
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowName = (row['Name'] ?? row['name'] ?? '').toString().trim();
            try {
                const start = this.parseTime(row['Start Time'] ?? row['startTime']);
                const end = this.parseTime(row['End Time'] ?? row['endTime']);
                const workingDays = this.normalizeDays(row['Working Days'] ?? row['workingDays']);
                const locationName = (row['Location Name'] ?? row['locationName'] ?? '')
                    .toString()
                    .trim()
                    .toLowerCase();
                const locationId = locationName
                    ? locationMap.get(locationName)
                    : undefined;
                this.logger.debug({
                    i,
                    rowName,
                    startRaw: row['Start Time'] ?? row['startTime'],
                    endRaw: row['End Time'] ?? row['endTime'],
                    start: start?.hhmm,
                    end: end?.hhmm,
                    workingDays,
                    locationName: locationName || null,
                    locationId: locationId || null,
                }, 'shifts.bulk:row-parse');
                if (locationName && !locationId) {
                    throw new common_1.BadRequestException(`Unknown location "${row['Location Name']}"`);
                }
                this.validateTimes(start, end);
                const dto = (0, class_transformer_1.plainToInstance)(create_shift_dto_1.CreateShiftDto, {
                    name: rowName,
                    startTime: start.hhmm,
                    endTime: end.hhmm,
                    workingDays,
                    lateToleranceMinutes: row['Late Tolerance Minutes'] !== undefined
                        ? +row['Late Tolerance Minutes']
                        : 10,
                    allowEarlyClockIn: row['Allow Early ClockIn'] !== undefined
                        ? Boolean(row['Allow Early ClockIn'])
                        : false,
                    earlyClockInMinutes: row['Early ClockIn Minutes'] !== undefined &&
                        row['Early ClockIn Minutes'] !== null
                        ? +row['Early ClockIn Minutes']
                        : 0,
                    allowLateClockOut: row['Allow Late ClockOut'] !== undefined
                        ? Boolean(row['Allow Late ClockOut'])
                        : false,
                    lateClockOutMinutes: row['Late ClockOut Minutes'] !== undefined &&
                        row['Late ClockOut Minutes'] !== null
                        ? +row['Late ClockOut Minutes']
                        : 0,
                    notes: row['Notes'] ?? row['notes'],
                    locationId,
                });
                const v = await (0, class_validator_1.validate)(dto);
                if (v.length) {
                    this.logger.warn({ i, rowName, issues: v }, 'shifts.bulk:class-validator-failed');
                    throw new common_1.BadRequestException(`Validation failed: ${JSON.stringify(v)}`);
                }
                valid.push(dto);
            }
            catch (e) {
                const reason = e?.message ?? 'Unknown error';
                errors.push({ rowName, error: reason });
                this.logger.error({ i, rowName, reason }, 'shifts.bulk:row-failed');
            }
        }
        this.logger.debug({ valid: valid.length, errors: errors.length }, 'shifts.bulk:prepared');
        if (valid.length === 0) {
            this.logger.warn({ errors }, 'shifts.bulk:no-valid-rows');
            throw new common_1.BadRequestException(`No valid rows to insert. Errors: ${errors.map((e) => `[${e.rowName}] ${e.error}`).join('; ')}`);
        }
        const inserted = await this.db.transaction(async (trx) => {
            const values = valid.map((d) => ({ companyId, ...d }));
            return trx
                .insert(shifts_schema_1.shifts)
                .values(values)
                .returning({
                id: shifts_schema_1.shifts.id,
                name: shifts_schema_1.shifts.name,
                startTime: shifts_schema_1.shifts.startTime,
                endTime: shifts_schema_1.shifts.endTime,
            })
                .execute();
        });
        this.logger.info({ inserted: inserted.length, errors: errors.length, ms: Date.now() - t0 }, 'shifts.bulk:done');
        await this.cache.del(this.listKey(companyId));
        return {
            insertedCount: inserted.length,
            inserted,
            errors,
        };
    }
    async create(dto, user, ip) {
        const start = this.parseTime(dto.startTime);
        const end = this.parseTime(dto.endTime);
        const days = this.normalizeDays(dto.workingDays);
        await this.ensureUniqueName(user.companyId, dto.name);
        await this.ensureLocationBelongs(user.companyId, dto.locationId);
        this.validateTimes(start, end);
        const [created] = await this.db
            .insert(shifts_schema_1.shifts)
            .values({
            companyId: user.companyId,
            ...dto,
            startTime: start.hhmm,
            endTime: end.hhmm,
            workingDays: days,
        })
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'create',
            entity: 'time.shift',
            entityId: created.id,
            details: 'Shift created',
            userId: user.id,
            ipAddress: ip,
            changes: { before: {}, after: created },
        });
        await this.invalidateAfterChange({
            companyId: user.companyId,
            shiftId: created.id,
        });
        return created;
    }
    async findAll(companyId, opts) {
        const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 500);
        const offset = Math.max(opts?.offset ?? 0, 0);
        const all = await this.cache.getOrSetCache(this.listKey(companyId), async () => {
            return this.db
                .select({
                id: shifts_schema_1.shifts.id,
                name: shifts_schema_1.shifts.name,
                startTime: shifts_schema_1.shifts.startTime,
                endTime: shifts_schema_1.shifts.endTime,
                workingDays: shifts_schema_1.shifts.workingDays,
                lateToleranceMinutes: shifts_schema_1.shifts.lateToleranceMinutes,
                allowEarlyClockIn: shifts_schema_1.shifts.allowEarlyClockIn,
                earlyClockInMinutes: shifts_schema_1.shifts.earlyClockInMinutes,
                allowLateClockOut: shifts_schema_1.shifts.allowLateClockOut,
                lateClockOutMinutes: shifts_schema_1.shifts.lateClockOutMinutes,
                locationName: schema_1.companyLocations.name,
                locationId: shifts_schema_1.shifts.locationId,
            })
                .from(shifts_schema_1.shifts)
                .leftJoin(schema_1.companyLocations, (0, drizzle_orm_1.eq)(shifts_schema_1.shifts.locationId, schema_1.companyLocations.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(shifts_schema_1.shifts.companyId, companyId), (0, drizzle_orm_1.eq)(shifts_schema_1.shifts.isDeleted, false)))
                .execute();
        });
        return all.slice(offset, offset + limit);
    }
    async findOne(id, companyId) {
        return this.cache.getOrSetCache(this.oneKey(id), async () => {
            const [row] = await this.db
                .select()
                .from(shifts_schema_1.shifts)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(shifts_schema_1.shifts.id, id), (0, drizzle_orm_1.eq)(shifts_schema_1.shifts.companyId, companyId), (0, drizzle_orm_1.eq)(shifts_schema_1.shifts.isDeleted, false)))
                .execute();
            if (!row)
                throw new common_1.BadRequestException(`Shift ${id} not found.`);
            return row;
        });
    }
    async update(id, dto, user, ip) {
        const before = await this.findOne(id, user.companyId);
        if (dto.name && dto.name !== before.name) {
            await this.ensureUniqueName(user.companyId, dto.name, id);
        }
        if (dto.locationId) {
            await this.ensureLocationBelongs(user.companyId, dto.locationId);
        }
        let start = undefined;
        let end = undefined;
        if (dto.startTime != null)
            start = this.parseTime(dto.startTime);
        if (dto.endTime != null)
            end = this.parseTime(dto.endTime);
        const finalStart = start?.hhmm ?? before.startTime;
        const finalEnd = end?.hhmm ?? before.endTime;
        if (start || end) {
            const s = start ?? this.parseTime(before.startTime);
            const e = end ?? this.parseTime(before.endTime);
            this.validateTimes(s, e);
        }
        const finalDays = dto.workingDays
            ? this.normalizeDays(dto.workingDays)
            : before.workingDays;
        const [updated] = await this.db
            .update(shifts_schema_1.shifts)
            .set({
            ...dto,
            startTime: finalStart,
            endTime: finalEnd,
            workingDays: finalDays,
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(shifts_schema_1.shifts.id, id), (0, drizzle_orm_1.eq)(shifts_schema_1.shifts.companyId, user.companyId), (0, drizzle_orm_1.eq)(shifts_schema_1.shifts.isDeleted, false)))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'shift',
            details: 'Shift updated',
            entityId: id,
            userId: user.id,
            ipAddress: ip,
            changes: { before, after: updated },
        });
        await this.invalidateAfterChange({
            companyId: user.companyId,
            shiftId: id,
        });
        return updated;
    }
    async remove(id, user) {
        const { companyId } = user;
        const before = await this.findOne(id, companyId);
        const [updated] = await this.db
            .update(shifts_schema_1.shifts)
            .set({ isDeleted: true })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(shifts_schema_1.shifts.id, id), (0, drizzle_orm_1.eq)(shifts_schema_1.shifts.companyId, companyId), (0, drizzle_orm_1.eq)(shifts_schema_1.shifts.isDeleted, false)))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'shift',
            entityId: id,
            details: 'Shift soft-deleted',
            userId: user.id,
            changes: { before, after: updated },
        });
        await this.invalidateAfterChange({ companyId, shiftId: id });
        return { success: true };
    }
};
exports.ShiftsService = ShiftsService;
exports.ShiftsService = ShiftsService = ShiftsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [audit_service_1.AuditService, Object, cache_service_1.CacheService,
        nestjs_pino_1.PinoLogger])
], ShiftsService);
//# sourceMappingURL=shifts.service.js.map