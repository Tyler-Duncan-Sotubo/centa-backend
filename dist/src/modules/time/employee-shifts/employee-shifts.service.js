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
exports.EmployeeShiftsService = void 0;
const common_1 = require("@nestjs/common");
const audit_service_1 = require("../../audit/audit.service");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const employee_shifts_schema_1 = require("../schema/employee-shifts.schema");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../audit/schema");
const schema_2 = require("../../../drizzle/schema");
const toCamelCase_1 = require("../../../utils/toCamelCase");
const cache_service_1 = require("../../../common/cache/cache.service");
let EmployeeShiftsService = class EmployeeShiftsService {
    constructor(auditService, db, cache) {
        this.auditService = auditService;
        this.db = db;
        this.cache = cache;
        this.ttlSeconds = 60 * 10;
    }
    tags(companyId) {
        return [
            `company:${companyId}:attendance`,
            `company:${companyId}:attendance:employee-shifts`,
        ];
    }
    async assertNoOverlap(companyId, employeeId, shiftDate) {
        const overlapping = await this.db
            .select()
            .from(employee_shifts_schema_1.employeeShifts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.companyId, companyId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.employeeId, employeeId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.shiftDate, shiftDate), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.isDeleted, false)))
            .execute();
        if (overlapping.length > 0) {
            throw new common_1.BadRequestException(`Employee ${employeeId} already has a shift assigned on ${shiftDate}`);
        }
    }
    async assignShift(employeeId, dto, user, ip) {
        const [employee] = await this.db
            .select()
            .from(schema_2.employees)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_2.employees.id, employeeId), (0, drizzle_orm_1.eq)(schema_2.employees.companyId, user.companyId)))
            .execute();
        if (!employee) {
            throw new common_1.BadRequestException(`Employee ${employeeId} not found.`);
        }
        const [shift] = await this.db
            .select()
            .from(schema_2.shifts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_2.shifts.id, dto.shiftId), (0, drizzle_orm_1.eq)(schema_2.shifts.companyId, user.companyId)))
            .execute();
        if (!shift) {
            throw new common_1.BadRequestException(`Shift ${dto.shiftId} not found.`);
        }
        if (shift.locationId && shift.locationId !== employee.locationId) {
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
        await this.cache.bumpCompanyVersion(user.companyId);
        return rec;
    }
    async updateShift(employeeShiftId, dto, user, ip) {
        const [employeeShift] = await this.db
            .select()
            .from(employee_shifts_schema_1.employeeShifts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.companyId, user.companyId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.id, employeeShiftId)))
            .execute();
        if (!employeeShift) {
            throw new common_1.NotFoundException(`Employee shift ${employeeShiftId} not found.`);
        }
        const [updatedRec] = await this.db
            .update(employee_shifts_schema_1.employeeShifts)
            .set({
            shiftDate: dto.shiftDate,
        })
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
        await this.cache.bumpCompanyVersion(user.companyId);
        return updatedRec;
    }
    async bulkAssignMany(companyId, dtos, user, ip) {
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
                throw new common_1.BadRequestException(`Shift ${dto.shiftId} not found.`);
            }
            if (!employee) {
                throw new common_1.BadRequestException(`Employee ${dto.employeeId} not found.`);
            }
            if (shift.locationId && shift.locationId !== employee.locationId) {
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
        await this.cache.bumpCompanyVersion(companyId);
        return inserted;
    }
    async removeAssignment(assignmentId, user, ip) {
        const existing = await this.db
            .select()
            .from(employee_shifts_schema_1.employeeShifts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.companyId, user.companyId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.id, assignmentId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.isDeleted, false)))
            .execute();
        if (existing.length === 0) {
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
        await this.cache.bumpCompanyVersion(user.companyId);
        return { success: true };
    }
    async bulkRemoveAssignments(employeeIds, user, ip) {
        const oldRecs = await this.db
            .update(employee_shifts_schema_1.employeeShifts)
            .set({ isDeleted: true })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.companyId, user.companyId), (0, drizzle_orm_1.inArray)(employee_shifts_schema_1.employeeShifts.employeeId, employeeIds), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.isDeleted, false)))
            .returning()
            .execute();
        if (oldRecs.length === 0) {
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
        await this.cache.bumpCompanyVersion(user.companyId);
        return { success: true, removedCount: oldRecs.length };
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
    async listAll(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['attendance', 'employee-shifts', 'list'], () => this.baseEmployeeShiftQuery()
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.companyId, companyId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.isDeleted, false)))
            .execute(), { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) });
    }
    async listAllPaginated(companyId, { page = 1, limit = 20, search, shiftId, }) {
        const offset = (page - 1) * limit;
        const conditions = [
            (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.companyId, companyId),
            (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.isDeleted, false),
        ];
        if (search) {
            conditions.push((0, drizzle_orm_1.sql) `CONCAT(${schema_2.employees.firstName}, ' ', ${schema_2.employees.lastName}) ILIKE ${'%' + search + '%'}`);
        }
        if (shiftId) {
            conditions.push((0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.shiftId, shiftId));
        }
        return this.cache.getOrSetVersioned(companyId, [
            'attendance',
            'employee-shifts',
            'page',
            String(page),
            'limit',
            String(limit),
            'q',
            search ?? '',
            'shift',
            shiftId ?? '',
        ], async () => {
            const data = await this.baseEmployeeShiftQuery()
                .where((0, drizzle_orm_1.and)(...conditions))
                .limit(limit)
                .offset(offset)
                .execute();
            const [{ count }] = await this.db
                .select({
                count: (0, drizzle_orm_1.sql) `COUNT(*)`,
            })
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
        }, { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) });
    }
    async getOne(companyId, assignmentId) {
        return this.cache.getOrSetVersioned(companyId, ['attendance', 'employee-shifts', 'one', assignmentId], async () => {
            const [rec] = await this.baseEmployeeShiftQuery()
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.companyId, companyId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.id, assignmentId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.isDeleted, false)))
                .execute();
            if (!rec) {
                throw new common_1.NotFoundException(`Assignment ${assignmentId} not found`);
            }
            return rec;
        }, { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) });
    }
    async listByEmployee(companyId, employeeId) {
        return this.cache.getOrSetVersioned(companyId, ['attendance', 'employee-shifts', 'by-employee', employeeId], () => this.baseEmployeeShiftQuery()
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.companyId, companyId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.employeeId, employeeId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.isDeleted, false)))
            .execute(), { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) });
    }
    async getActiveShiftForEmployee(employeeId, companyId, date) {
        return this.cache.getOrSetVersioned(companyId, ['attendance', 'employee-shifts', 'active', employeeId, date], async () => {
            const [assignment] = await this.db
                .select({ shiftId: employee_shifts_schema_1.employeeShifts.shiftId })
                .from(employee_shifts_schema_1.employeeShifts)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.companyId, companyId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.employeeId, employeeId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.isDeleted, false), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.shiftDate, date)))
                .execute();
            if (!assignment) {
                return null;
            }
            const [shiftRec] = await this.db
                .select()
                .from(schema_2.shifts)
                .where((0, drizzle_orm_1.and)(assignment.shiftId
                ? (0, drizzle_orm_1.eq)(schema_2.shifts.id, assignment.shiftId)
                : (0, drizzle_orm_1.sql) `false`, (0, drizzle_orm_1.eq)(schema_2.shifts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_2.shifts.isDeleted, false)))
                .execute();
            return shiftRec || null;
        }, { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) });
    }
    async listByShift(companyId, shiftId) {
        return this.cache.getOrSetVersioned(companyId, ['attendance', 'employee-shifts', 'by-shift', shiftId], () => this.baseEmployeeShiftQuery()
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.companyId, companyId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.shiftId, shiftId), (0, drizzle_orm_1.eq)(employee_shifts_schema_1.employeeShifts.isDeleted, false)))
            .execute(), { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) });
    }
    async getCalendarEvents(companyId, from, to) {
        return this.cache.getOrSetVersioned(companyId, ['attendance', 'employee-shifts', 'calendar', from, to], async () => {
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
                if (!groupedEvents[location]) {
                    groupedEvents[location] = [];
                }
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
            return camelCasedGroupedEvents;
        }, { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) });
    }
};
exports.EmployeeShiftsService = EmployeeShiftsService;
exports.EmployeeShiftsService = EmployeeShiftsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [audit_service_1.AuditService, Object, cache_service_1.CacheService])
], EmployeeShiftsService);
//# sourceMappingURL=employee-shifts.service.js.map