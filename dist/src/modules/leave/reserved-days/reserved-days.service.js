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
exports.ReservedDaysService = void 0;
const common_1 = require("@nestjs/common");
const reserved_day_schema_1 = require("./schema/reserved-day.schema");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const audit_service_1 = require("../../audit/audit.service");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../../drizzle/schema");
const leave_types_schema_1 = require("../schema/leave-types.schema");
const date_fns_1 = require("date-fns");
let ReservedDaysService = class ReservedDaysService {
    constructor(db, auditService) {
        this.db = db;
        this.auditService = auditService;
    }
    async create(dto, user) {
        const { startDate, endDate } = dto;
        const existingReservedDays = await this.db
            .select()
            .from(reserved_day_schema_1.reservedLeaveDays)
            .where((0, drizzle_orm_1.eq)(reserved_day_schema_1.reservedLeaveDays.companyId, user.companyId))
            .execute();
        const conflict = existingReservedDays.find((day) => (0, date_fns_1.isWithinInterval)((0, date_fns_1.parseISO)(day.startDate), {
            start: (0, date_fns_1.parseISO)(startDate),
            end: (0, date_fns_1.parseISO)(endDate),
        }) ||
            (0, date_fns_1.isWithinInterval)((0, date_fns_1.parseISO)(day.endDate), {
                start: (0, date_fns_1.parseISO)(startDate),
                end: (0, date_fns_1.parseISO)(endDate),
            }));
        if (conflict) {
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
            changes: JSON.stringify(dto),
        });
        return reservedDay;
    }
    async getReservedDates(companyId, employeeId) {
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
            range.forEach((date) => {
                allDates.push((0, date_fns_1.format)(date, 'yyyy-MM-dd'));
            });
        }
        return allDates;
    }
    async findAll(companyId) {
        return this.db
            .select({
            id: reserved_day_schema_1.reservedLeaveDays.id,
            startDate: reserved_day_schema_1.reservedLeaveDays.startDate,
            endDate: reserved_day_schema_1.reservedLeaveDays.endDate,
            createdAt: reserved_day_schema_1.reservedLeaveDays.createdAt,
            employeeName: (0, drizzle_orm_1.sql) `concat(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
            leaveType: leave_types_schema_1.leaveTypes.name,
            createdBy: (0, drizzle_orm_1.sql) `concat(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})`,
            reason: reserved_day_schema_1.reservedLeaveDays.reason,
        })
            .from(reserved_day_schema_1.reservedLeaveDays)
            .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(reserved_day_schema_1.reservedLeaveDays.createdBy, schema_1.users.id))
            .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(reserved_day_schema_1.reservedLeaveDays.employeeId, schema_1.employees.id))
            .innerJoin(leave_types_schema_1.leaveTypes, (0, drizzle_orm_1.eq)(reserved_day_schema_1.reservedLeaveDays.leaveTypeId, leave_types_schema_1.leaveTypes.id))
            .where((0, drizzle_orm_1.eq)(reserved_day_schema_1.reservedLeaveDays.companyId, companyId))
            .execute();
    }
    async findByEmployee(employeeId) {
        return this.db
            .select()
            .from(reserved_day_schema_1.reservedLeaveDays)
            .where((0, drizzle_orm_1.eq)(reserved_day_schema_1.reservedLeaveDays.employeeId, employeeId))
            .execute();
    }
    async findOne(id) {
        const [reservedDay] = await this.db
            .select()
            .from(reserved_day_schema_1.reservedLeaveDays)
            .where((0, drizzle_orm_1.eq)(reserved_day_schema_1.reservedLeaveDays.id, id))
            .execute();
        if (!reservedDay) {
            throw new common_1.BadRequestException('Reserved day not found');
        }
        return reservedDay;
    }
    async update(id, dto, user) {
        await this.findOne(id);
        const reservedDay = this.db
            .update(reserved_day_schema_1.reservedLeaveDays)
            .set(dto)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(reserved_day_schema_1.reservedLeaveDays.id, id), (0, drizzle_orm_1.eq)(reserved_day_schema_1.reservedLeaveDays.companyId, user.companyId)))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'reservedLeaveDays',
            entityId: reservedDay[0].id,
            userId: user.id,
            details: 'Reserved day updated',
            changes: JSON.stringify(dto),
        });
        return reservedDay;
    }
    async remove(id) {
        return this.db
            .delete(reserved_day_schema_1.reservedLeaveDays)
            .where((0, drizzle_orm_1.eq)(reserved_day_schema_1.reservedLeaveDays.id, id))
            .execute();
    }
};
exports.ReservedDaysService = ReservedDaysService;
exports.ReservedDaysService = ReservedDaysService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService])
], ReservedDaysService);
//# sourceMappingURL=reserved-days.service.js.map