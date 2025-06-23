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
let ShiftsService = class ShiftsService {
    constructor(auditService, db) {
        this.auditService = auditService;
        this.db = db;
    }
    async bulkCreate(companyId, rows) {
        const convertExcelTime = (value) => {
            if (typeof value === 'number') {
                const totalMinutes = Math.round(value * 24 * 60);
                const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
                const minutes = String(totalMinutes % 60).padStart(2, '0');
                return `${hours}:${minutes}`;
            }
            return typeof value === 'string' ? value : undefined;
        };
        const names = rows.map((r) => r['Name'] ?? r['name']);
        const duplicates = await this.db
            .select({ name: shifts_schema_1.shifts.name })
            .from(shifts_schema_1.shifts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(shifts_schema_1.shifts.companyId, companyId), (0, drizzle_orm_1.eq)(shifts_schema_1.shifts.isDeleted, false), (0, drizzle_orm_1.inArray)(shifts_schema_1.shifts.name, names)))
            .execute();
        if (duplicates.length) {
            const dupes = duplicates.map((d) => d.name).join(', ');
            throw new common_1.BadRequestException(`Shift names already exist: ${dupes}`);
        }
        const locationList = await this.db
            .select({ id: schema_1.companyLocations.id, name: schema_1.companyLocations.name })
            .from(schema_1.companyLocations)
            .where((0, drizzle_orm_1.eq)(schema_1.companyLocations.companyId, companyId))
            .execute();
        const locationMap = new Map(locationList.map((loc) => [loc.name.toLowerCase(), loc.id]));
        const dtos = [];
        for (const row of rows) {
            const rawDays = row['Working Days'] ?? row['workingDays'];
            let workingDays;
            if (typeof rawDays === 'string') {
                try {
                    workingDays = JSON.parse(rawDays);
                }
                catch {
                    throw new common_1.BadRequestException(`Invalid WorkingDays format for "${row['Name']}": must be a JSON array`);
                }
            }
            else {
                workingDays = rawDays;
            }
            let locationId;
            const locationName = row['Location Name'] ?? row['locationName'];
            if (locationName) {
                const match = locationMap.get(locationName.toLowerCase());
                if (!match) {
                    throw new common_1.BadRequestException(`Unknown location name "${locationName}" in row "${row['Name']}"`);
                }
                locationId = match;
            }
            const dto = (0, class_transformer_1.plainToInstance)(create_shift_dto_1.CreateShiftDto, {
                name: row['Name'] ?? row['name'],
                startTime: convertExcelTime(row['Start Time'] ?? row['startTime']),
                endTime: convertExcelTime(row['End Time'] ?? row['endTime']),
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
            });
            const errors = await (0, class_validator_1.validate)(dto);
            if (errors.length) {
                throw new common_1.BadRequestException(`Invalid data in shift "${dto.name}": ${JSON.stringify(errors)}`);
            }
            dtos.push({ ...dto, locationId });
        }
        const inserted = await this.db.transaction(async (trx) => {
            const values = dtos.map((d) => ({ companyId, ...d }));
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
        return inserted;
    }
    async create(dto, user, ip) {
        const [shift] = await this.db
            .insert(shifts_schema_1.shifts)
            .values({ companyId: user.companyId, ...dto })
            .returning();
        await this.auditService.logAction({
            action: 'create',
            entity: 'time.shift',
            entityId: shift.id,
            details: 'Shift created',
            userId: user.id,
            ipAddress: ip,
            changes: {
                before: {},
                after: shift,
            },
        });
        return shift;
    }
    findAll(companyId) {
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
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(shifts_schema_1.shifts.companyId, companyId), (0, drizzle_orm_1.eq)(shifts_schema_1.shifts.isDeleted, false)));
    }
    async findOne(id, companyId) {
        const [shift] = await this.db
            .select()
            .from(shifts_schema_1.shifts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(shifts_schema_1.shifts.id, id), (0, drizzle_orm_1.eq)(shifts_schema_1.shifts.companyId, companyId), (0, drizzle_orm_1.eq)(shifts_schema_1.shifts.isDeleted, false)))
            .execute();
        if (!shift) {
            throw new common_1.BadRequestException(`Shift ${id} not found.`);
        }
        return shift[0];
    }
    async update(id, dto, user, ip) {
        await this.findOne(id, user.companyId);
        const result = await this.db
            .update(shifts_schema_1.shifts)
            .set({
            ...dto,
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(shifts_schema_1.shifts.id, id), (0, drizzle_orm_1.eq)(shifts_schema_1.shifts.companyId, user.companyId), (0, drizzle_orm_1.eq)(shifts_schema_1.shifts.isDeleted, false)))
            .returning();
        await this.auditService.logAction({
            action: 'update',
            entity: 'shift',
            details: 'Shift updated',
            entityId: id,
            userId: user.id,
            ipAddress: ip,
            changes: {
                before: result[0],
                after: { ...result[0], ...dto },
            },
        });
        return result[0];
    }
    async remove(id, companyId) {
        await this.findOne(id, companyId);
        await this.db
            .update(shifts_schema_1.shifts)
            .set({ isDeleted: true })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(shifts_schema_1.shifts.id, id), (0, drizzle_orm_1.eq)(shifts_schema_1.shifts.companyId, companyId), (0, drizzle_orm_1.eq)(shifts_schema_1.shifts.isDeleted, false)))
            .returning();
        return { success: true };
    }
};
exports.ShiftsService = ShiftsService;
exports.ShiftsService = ShiftsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [audit_service_1.AuditService, Object])
], ShiftsService);
//# sourceMappingURL=shifts.service.js.map