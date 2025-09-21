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
exports.PayGroupsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../../../drizzle/schema");
const drizzle_orm_1 = require("drizzle-orm");
const pay_groups_schema_1 = require("../schema/pay-groups.schema");
const pay_schedules_schema_1 = require("../schema/pay-schedules.schema");
const cache_service_1 = require("../../../common/cache/cache.service");
const audit_service_1 = require("../../audit/audit.service");
const company_settings_service_1 = require("../../../company-settings/company-settings.service");
let PayGroupsService = class PayGroupsService {
    constructor(db, cacheService, auditService, companySettings) {
        this.db = db;
        this.cacheService = cacheService;
        this.auditService = auditService;
        this.companySettings = companySettings;
    }
    async getCompanyIdByEmployeeId(employeeId) {
        const [row] = await this.db
            .select({ companyId: schema_1.employees.companyId })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.eq)(schema_1.employees.id, employeeId))
            .limit(1)
            .execute();
        if (!row?.companyId) {
            throw new common_1.BadRequestException('Employee not found');
        }
        return row.companyId;
    }
    async getCompanyIdByGroupId(groupId) {
        const [row] = await this.db
            .select({ companyId: pay_groups_schema_1.payGroups.companyId })
            .from(pay_groups_schema_1.payGroups)
            .where((0, drizzle_orm_1.eq)(pay_groups_schema_1.payGroups.id, groupId))
            .limit(1)
            .execute();
        if (!row?.companyId) {
            throw new common_1.BadRequestException('Pay group not found');
        }
        return row.companyId;
    }
    async findOneEmployee(employeeId) {
        const companyId = await this.getCompanyIdByEmployeeId(employeeId);
        return this.cacheService.getOrSetVersioned(companyId, ['employee', 'byId', employeeId], async () => {
            const [employee] = await this.db
                .select({ id: schema_1.employees.id })
                .from(schema_1.employees)
                .where((0, drizzle_orm_1.eq)(schema_1.employees.id, employeeId))
                .execute();
            if (!employee) {
                throw new common_1.BadRequestException('Employee not found');
            }
            return employee;
        }, {
            tags: [
                'employees',
                `company:${companyId}:employees`,
                `employee:${employeeId}`,
            ],
        });
    }
    async findAll(companyId) {
        return this.cacheService.getOrSetVersioned(companyId, ['payGroups', 'list'], async () => {
            return this.db
                .select({
                id: pay_groups_schema_1.payGroups.id,
                name: pay_groups_schema_1.payGroups.name,
                pay_schedule_id: pay_groups_schema_1.payGroups.payScheduleId,
                apply_nhf: pay_groups_schema_1.payGroups.applyNhf,
                apply_pension: pay_groups_schema_1.payGroups.applyPension,
                apply_paye: pay_groups_schema_1.payGroups.applyPaye,
                payFrequency: pay_schedules_schema_1.paySchedules.payFrequency,
                createdAt: pay_groups_schema_1.payGroups.createdAt,
            })
                .from(pay_groups_schema_1.payGroups)
                .innerJoin(pay_schedules_schema_1.paySchedules, (0, drizzle_orm_1.eq)(pay_groups_schema_1.payGroups.payScheduleId, pay_schedules_schema_1.paySchedules.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(pay_groups_schema_1.payGroups.companyId, companyId), (0, drizzle_orm_1.eq)(pay_groups_schema_1.payGroups.isDeleted, false)))
                .execute();
        }, { tags: ['payGroups', `company:${companyId}:payGroups`] });
    }
    async findOne(groupId) {
        const companyId = await this.getCompanyIdByGroupId(groupId);
        return this.cacheService.getOrSetVersioned(companyId, ['payGroups', 'byId', groupId], async () => {
            const [group] = await this.db
                .select()
                .from(pay_groups_schema_1.payGroups)
                .where((0, drizzle_orm_1.eq)(pay_groups_schema_1.payGroups.id, groupId))
                .execute();
            if (!group) {
                throw new common_1.BadRequestException('Pay group not found');
            }
            return group;
        }, {
            tags: [
                'payGroups',
                `company:${companyId}:payGroups`,
                `payGroup:${groupId}`,
            ],
        });
    }
    async findEmployeesInGroup(groupId) {
        const companyId = await this.getCompanyIdByGroupId(groupId);
        return this.cacheService.getOrSetVersioned(companyId, ['payGroups', 'members', groupId], async () => {
            const employeesList = await this.db
                .select({
                id: schema_1.employees.id,
                first_name: schema_1.employees.firstName,
                last_name: schema_1.employees.lastName,
            })
                .from(schema_1.employees)
                .where((0, drizzle_orm_1.eq)(schema_1.employees.payGroupId, groupId))
                .execute();
            if (!employeesList.length) {
                throw new common_1.BadRequestException('No employees found in this group');
            }
            return employeesList;
        }, {
            tags: [
                'payGroups',
                `company:${companyId}:payGroups`,
                `payGroup:${groupId}:members`,
            ],
        });
    }
    async create(user, dto, ip) {
        const [paySchedule] = await this.db
            .select({ id: pay_schedules_schema_1.paySchedules.id })
            .from(pay_schedules_schema_1.paySchedules)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(pay_schedules_schema_1.paySchedules.id, dto.payScheduleId), (0, drizzle_orm_1.eq)(pay_schedules_schema_1.paySchedules.companyId, user.companyId), (0, drizzle_orm_1.eq)(pay_schedules_schema_1.paySchedules.isDeleted, false)))
            .execute();
        if (!paySchedule) {
            throw new common_1.BadRequestException('Pay schedule not found');
        }
        const existingGroup = await this.db
            .select({ id: pay_groups_schema_1.payGroups.id })
            .from(pay_groups_schema_1.payGroups)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(pay_groups_schema_1.payGroups.name, dto.name.toLowerCase()), (0, drizzle_orm_1.eq)(pay_groups_schema_1.payGroups.companyId, user.companyId), (0, drizzle_orm_1.eq)(pay_groups_schema_1.payGroups.isDeleted, false)))
            .execute();
        if (existingGroup.length) {
            throw new common_1.BadRequestException('Pay group with this name already exists');
        }
        const [newGroup] = await this.db
            .insert(pay_groups_schema_1.payGroups)
            .values({
            ...dto,
            name: dto.name.toLowerCase(),
            companyId: user.companyId,
        })
            .returning()
            .execute();
        if (dto.employees?.length) {
            await this.addEmployeesToGroup(dto.employees, newGroup.id, user, ip);
        }
        await this.companySettings.setOnboardingTask(user.companyId, 'payroll', 'pay_group', 'done');
        await this.cacheService.bumpCompanyVersion(user.companyId);
        await this.cacheService.invalidateTags([
            'payGroups',
            `company:${user.companyId}:payGroups`,
            `payGroup:${newGroup.id}`,
            `payGroup:${newGroup.id}:members`,
        ]);
        return newGroup;
    }
    async update(groupId, dto, user, ip) {
        await this.findOne(groupId);
        await this.db
            .update(pay_groups_schema_1.payGroups)
            .set({ ...dto })
            .where((0, drizzle_orm_1.eq)(pay_groups_schema_1.payGroups.id, groupId))
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'pay_group',
            entityId: groupId,
            userId: user.id,
            ipAddress: ip,
            details: `Updated pay group with ID ${groupId}`,
            changes: {
                updated: true,
                groupId,
                changes: dto,
            },
        });
        await this.cacheService.bumpCompanyVersion(user.companyId);
        await this.cacheService.invalidateTags([
            'payGroups',
            `company:${user.companyId}:payGroups`,
            `payGroup:${groupId}`,
            `payGroup:${groupId}:members`,
        ]);
        return { message: 'Pay group updated successfully' };
    }
    async remove(groupId, user, ip) {
        const employeesInGroup = await this.db
            .select({ id: schema_1.employees.id })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.eq)(schema_1.employees.payGroupId, groupId))
            .execute();
        if (employeesInGroup.length) {
            throw new common_1.BadRequestException('Cannot delete pay group with employees assigned to it');
        }
        await this.db
            .update(pay_groups_schema_1.payGroups)
            .set({ isDeleted: true })
            .where((0, drizzle_orm_1.eq)(pay_groups_schema_1.payGroups.id, groupId))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'pay_group',
            entityId: groupId,
            userId: user.id,
            ipAddress: ip,
            details: `Deleted pay group with ID ${groupId}`,
            changes: {
                deleted: true,
                groupId,
            },
        });
        await this.cacheService.bumpCompanyVersion(user.companyId);
        await this.cacheService.invalidateTags([
            'payGroups',
            `company:${user.companyId}:payGroups`,
            `payGroup:${groupId}`,
            `payGroup:${groupId}:members`,
        ]);
        return { message: 'Pay group deleted successfully' };
    }
    async addEmployeesToGroup(employeeIds, groupId, user, ip) {
        const idsArray = Array.isArray(employeeIds) ? employeeIds : [employeeIds];
        const existingEmployees = await this.db
            .select({ id: schema_1.employees.id })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.inArray)(schema_1.employees.id, idsArray))
            .execute();
        if (existingEmployees.length !== idsArray.length) {
            throw new common_1.BadRequestException('Some employees not found');
        }
        await this.db
            .update(schema_1.employees)
            .set({ payGroupId: groupId })
            .where((0, drizzle_orm_1.inArray)(schema_1.employees.id, idsArray))
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'pay_group',
            entityId: groupId,
            userId: user.id,
            ipAddress: ip,
            details: `Added employees to pay group with ID ${groupId}`,
            changes: {
                added: true,
                groupId,
                employeeIds: idsArray,
            },
        });
        await this.cacheService.bumpCompanyVersion(user.companyId);
        await this.cacheService.invalidateTags([
            'payGroups',
            `company:${user.companyId}:payGroups`,
            `payGroup:${groupId}`,
            `payGroup:${groupId}:members`,
        ]);
        return {
            message: `${idsArray.length} employees added to group ${groupId}`,
        };
    }
    async removeEmployeesFromGroup(employeeIds, user, ip) {
        const idsArray = Array.isArray(employeeIds) ? employeeIds : [employeeIds];
        const currentGroups = await this.db
            .select({ groupId: schema_1.employees.payGroupId })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.inArray)(schema_1.employees.id, idsArray))
            .execute();
        const distinctGroupIds = Array.from(new Set(currentGroups
            .map((g) => g.groupId)
            .filter((g) => Boolean(g))));
        const [deleted] = await this.db
            .update(schema_1.employees)
            .set({ payGroupId: null })
            .where((0, drizzle_orm_1.inArray)(schema_1.employees.id, idsArray))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'pay_group',
            entityId: deleted.id,
            userId: user.id,
            ipAddress: ip,
            details: `Removed employees from pay group`,
            changes: {
                removed: true,
                employeeIds: idsArray,
            },
        });
        await this.cacheService.bumpCompanyVersion(user.companyId);
        await this.cacheService.invalidateTags([
            'payGroups',
            `company:${user.companyId}:payGroups`,
            ...distinctGroupIds.map((g) => `payGroup:${g}:members`),
            ...distinctGroupIds.map((g) => `payGroup:${g}`),
        ]);
        return {
            message: `${idsArray.length} employees removed from group successfully`,
        };
    }
};
exports.PayGroupsService = PayGroupsService;
exports.PayGroupsService = PayGroupsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService,
        company_settings_service_1.CompanySettingsService])
], PayGroupsService);
//# sourceMappingURL=pay-groups.service.js.map