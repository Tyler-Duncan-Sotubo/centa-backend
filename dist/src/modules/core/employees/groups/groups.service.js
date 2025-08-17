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
exports.GroupsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const audit_service_1 = require("../../../audit/audit.service");
const drizzle_orm_1 = require("drizzle-orm");
const group_schema_1 = require("../schema/group.schema");
const employee_schema_1 = require("../schema/employee.schema");
const cache_service_1 = require("../../../../common/cache/cache.service");
let GroupsService = class GroupsService {
    constructor(db, auditService, cache) {
        this.db = db;
        this.auditService = auditService;
        this.cache = cache;
        this.table = group_schema_1.groups;
        this.tableMembers = group_schema_1.groupMemberships;
    }
    tags(scope) {
        return [
            `company:${scope}:groups`,
            `company:${scope}:groups:list`,
            `company:${scope}:groups:detail`,
            `company:${scope}:groups:members`,
        ];
    }
    async getGroupOrThrow(id) {
        const [row] = await this.db
            .select({
            id: this.table.id,
            name: this.table.name,
            companyId: this.table.companyId,
        })
            .from(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.id, id))
            .limit(1)
            .execute();
        if (!row)
            throw new common_1.BadRequestException('Group not found');
        return row;
    }
    assertSameCompany(groupCompanyId, userCompanyId) {
        if (groupCompanyId !== userCompanyId) {
            throw new common_1.BadRequestException('Group does not belong to your company');
        }
    }
    async clearOtherPrimariesForEmployee(tx, employeeId, exceptGroupId) {
        await tx
            .update(this.tableMembers)
            .set({ isPrimary: false })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(this.tableMembers.employeeId, employeeId), exceptGroupId
            ? (0, drizzle_orm_1.ne)(this.tableMembers.groupId, exceptGroupId)
            : (0, drizzle_orm_1.sql) `true`))
            .execute();
    }
    normalizeCreateMembers(dto) {
        if (dto.employeeIds && !dto.members) {
            dto.members = dto.employeeIds.map((employeeId) => ({
                employeeId,
            }));
        }
        return dto.members ?? [];
    }
    normalizeAddMembers(dto) {
        if (dto.memberIds && !dto.members) {
            dto.members = dto.memberIds.map((employeeId) => ({
                employeeId,
            }));
        }
        return dto.members ?? [];
    }
    async create(createGroupDto, user, ip) {
        const { companyId, id: userId } = user;
        const [existing] = await this.db
            .select({ id: this.table.id })
            .from(this.table)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(this.table.companyId, companyId), (0, drizzle_orm_1.eq)(this.table.name, createGroupDto.name)))
            .limit(1)
            .execute();
        if (existing) {
            throw new common_1.BadRequestException(`Group with name "${createGroupDto.name}" already exists`);
        }
        const membersPayload = this.normalizeCreateMembers(createGroupDto);
        const [newGroup] = await this.db
            .insert(this.table)
            .values({
            companyId,
            name: createGroupDto.name,
            slug: createGroupDto.slug,
            type: createGroupDto.type ?? 'TEAM',
            parentGroupId: createGroupDto.parentGroupId ?? null,
            location: createGroupDto.location,
            timezone: createGroupDto.timezone,
            headcountCap: createGroupDto.headcountCap ?? null,
        })
            .returning()
            .execute();
        await this.db.transaction(async (tx) => {
            for (const m of membersPayload) {
                if (m.isPrimary) {
                    await this.clearOtherPrimariesForEmployee(tx, m.employeeId, newGroup.id);
                }
                await tx
                    .insert(this.tableMembers)
                    .values({
                    groupId: newGroup.id,
                    employeeId: m.employeeId,
                    role: m.role ?? 'member',
                    isPrimary: !!m.isPrimary,
                    title: m.title ?? null,
                    startDate: m.startDate ?? null,
                    endDate: m.endDate ?? null,
                    allocationPct: m.allocationPct ?? null,
                })
                    .onConflictDoUpdate({
                    target: [this.tableMembers.groupId, this.tableMembers.employeeId],
                    set: {
                        role: (0, drizzle_orm_1.sql) `excluded.role`,
                        isPrimary: (0, drizzle_orm_1.sql) `excluded.is_primary`,
                        title: (0, drizzle_orm_1.sql) `excluded.title`,
                        startDate: (0, drizzle_orm_1.sql) `excluded.start_date`,
                        endDate: (0, drizzle_orm_1.sql) `excluded.end_date`,
                        allocationPct: (0, drizzle_orm_1.sql) `excluded.allocation_pct`,
                        updatedAt: (0, drizzle_orm_1.sql) `now()`,
                    },
                })
                    .execute();
            }
        });
        await this.auditService.logAction({
            action: 'create',
            entity: 'Group',
            details: 'Created new group',
            userId,
            entityId: newGroup.id,
            ipAddress: ip,
            changes: {
                name: { before: null, after: newGroup.name },
                companyId: { before: null, after: newGroup.companyId },
            },
        });
        await this.cache.bumpCompanyVersion(companyId);
        return newGroup;
    }
    async addMembers(groupId, body, user, ip) {
        const { id: userId, companyId } = user;
        const group = await this.getGroupOrThrow(groupId);
        this.assertSameCompany(group.companyId, companyId);
        const members = this.normalizeAddMembers(body);
        if (members.length === 0) {
            return { message: 'No members to add', members: [] };
        }
        await this.db.transaction(async (tx) => {
            for (const m of members) {
                if (m.isPrimary) {
                    await this.clearOtherPrimariesForEmployee(tx, m.employeeId, groupId);
                }
                await tx
                    .insert(this.tableMembers)
                    .values({
                    groupId,
                    employeeId: m.employeeId,
                    role: m.role ?? 'member',
                    isPrimary: !!m.isPrimary,
                    title: m.title ?? null,
                    startDate: m.startDate ?? null,
                    endDate: m.endDate ?? null,
                    allocationPct: m.allocationPct ?? null,
                })
                    .onConflictDoUpdate({
                    target: [this.tableMembers.groupId, this.tableMembers.employeeId],
                    set: {
                        role: (0, drizzle_orm_1.sql) `excluded.role`,
                        isPrimary: (0, drizzle_orm_1.sql) `excluded.is_primary`,
                        title: (0, drizzle_orm_1.sql) `excluded.title`,
                        startDate: (0, drizzle_orm_1.sql) `excluded.start_date`,
                        endDate: (0, drizzle_orm_1.sql) `excluded.end_date`,
                        allocationPct: (0, drizzle_orm_1.sql) `excluded.allocation_pct`,
                        updatedAt: (0, drizzle_orm_1.sql) `now()`,
                    },
                })
                    .execute();
            }
        });
        await this.auditService.logAction({
            action: 'create',
            entity: 'Group',
            details: 'Added/updated members in group',
            userId,
            entityId: groupId,
            ipAddress: ip,
            changes: { members: { before: null, after: members } },
        });
        await this.cache.bumpCompanyVersion(group.companyId);
        return { message: 'Members upserted successfully', members };
    }
    async findAll(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['groups', 'list', 'all'], async () => {
            const rows = await this.db
                .select({
                id: this.table.id,
                name: this.table.name,
                type: this.table.type,
                parentGroupId: this.table.parentGroupId,
                createdAt: this.table.createdAt,
                members: (0, drizzle_orm_1.count)(this.tableMembers.groupId).as('memberCount'),
                leadEmployeeId: (0, drizzle_orm_1.sql) `
            (
              array_agg(${this.tableMembers.employeeId}
                        ORDER BY ${this.tableMembers.joinedAt} DESC)
              FILTER (WHERE ${this.tableMembers.role} = 'lead'
                          AND ${this.tableMembers.endDate} IS NULL)
            )[1]
          `.as('leadEmployeeId'),
                leadEmployeeName: (0, drizzle_orm_1.sql) `
            (
              array_agg((${employee_schema_1.employees.firstName} || ' ' || ${employee_schema_1.employees.lastName})
                        ORDER BY ${this.tableMembers.joinedAt} DESC)
              FILTER (WHERE ${this.tableMembers.role} = 'lead'
                          AND ${this.tableMembers.endDate} IS NULL)
            )[1]
          `.as('leadEmployeeName'),
            })
                .from(this.table)
                .leftJoin(this.tableMembers, (0, drizzle_orm_1.eq)(this.tableMembers.groupId, this.table.id))
                .leftJoin(employee_schema_1.employees, (0, drizzle_orm_1.eq)(employee_schema_1.employees.id, this.tableMembers.employeeId))
                .where((0, drizzle_orm_1.eq)(this.table.companyId, companyId))
                .groupBy(this.table.id, this.table.name, this.table.type, this.table.parentGroupId, this.table.createdAt)
                .orderBy((0, drizzle_orm_1.desc)(this.table.createdAt))
                .execute();
            return rows;
        }, { tags: this.tags(companyId) });
    }
    async findOne(id) {
        const base = await this.getGroupOrThrow(id);
        return this.cache.getOrSetVersioned(base.companyId, ['groups', 'detail', id], async () => {
            const memberships = await this.db
                .select()
                .from(this.tableMembers)
                .where((0, drizzle_orm_1.eq)(this.tableMembers.groupId, id))
                .execute();
            const memberIds = memberships.map((m) => m.employeeId);
            const employeesDetails = memberIds.length
                ? await this.db
                    .select({
                    id: employee_schema_1.employees.id,
                    firstName: employee_schema_1.employees.firstName,
                    lastName: employee_schema_1.employees.lastName,
                    email: employee_schema_1.employees.email,
                })
                    .from(employee_schema_1.employees)
                    .where((0, drizzle_orm_1.inArray)(employee_schema_1.employees.id, memberIds))
                    .execute()
                : [];
            const members = employeesDetails.map((e) => {
                const meta = memberships.find((m) => m.employeeId === e.id);
                return { ...e, ...meta };
            });
            return { ...base, members };
        }, { tags: this.tags(base.companyId) });
    }
    async findEmployeesGroups(employeeId) {
        return this.cache.getOrSetVersioned(`employee:${employeeId}`, ['groups', 'byEmployee', employeeId], async () => {
            const rows = await this.db
                .select({
                id: this.table.id,
                name: this.table.name,
                type: this.table.type,
                parentGroupId: this.table.parentGroupId,
                role: this.tableMembers.role,
                isPrimary: this.tableMembers.isPrimary,
                startDate: this.tableMembers.startDate,
                endDate: this.tableMembers.endDate,
                allocationPct: this.tableMembers.allocationPct,
            })
                .from(this.tableMembers)
                .innerJoin(this.table, (0, drizzle_orm_1.eq)(this.table.id, this.tableMembers.groupId))
                .where((0, drizzle_orm_1.eq)(this.tableMembers.employeeId, employeeId))
                .execute();
            return rows;
        }, { tags: this.tags(employeeId) });
    }
    async update(groupId, updateGroupDto, user, ip) {
        const { companyId, id: userId } = user;
        const base = await this.getGroupOrThrow(groupId);
        this.assertSameCompany(base.companyId, companyId);
        const incomingMembers = updateGroupDto.members ??
            updateGroupDto.employeeIds?.map((employeeId) => ({
                employeeId,
            }));
        await this.db.transaction(async (tx) => {
            if (incomingMembers && incomingMembers.length) {
                for (const m of incomingMembers) {
                    if (m.isPrimary) {
                        await this.clearOtherPrimariesForEmployee(tx, m.employeeId, groupId);
                    }
                    await tx
                        .insert(this.tableMembers)
                        .values({
                        groupId,
                        employeeId: m.employeeId,
                        role: m.role ?? 'member',
                        isPrimary: !!m.isPrimary,
                        title: m.title ?? null,
                        startDate: m.startDate ?? null,
                        endDate: m.endDate ?? null,
                        allocationPct: m.allocationPct ?? null,
                    })
                        .onConflictDoUpdate({
                        target: [this.tableMembers.groupId, this.tableMembers.employeeId],
                        set: {
                            role: (0, drizzle_orm_1.sql) `excluded.role`,
                            isPrimary: (0, drizzle_orm_1.sql) `excluded.is_primary`,
                            title: (0, drizzle_orm_1.sql) `excluded.title`,
                            startDate: (0, drizzle_orm_1.sql) `excluded.start_date`,
                            endDate: (0, drizzle_orm_1.sql) `excluded.end_date`,
                            allocationPct: (0, drizzle_orm_1.sql) `excluded.allocation_pct`,
                            updatedAt: (0, drizzle_orm_1.sql) `now()`,
                        },
                    })
                        .execute();
                }
            }
            await tx
                .update(this.table)
                .set({
                name: updateGroupDto.name ?? undefined,
                slug: updateGroupDto.slug ?? undefined,
                type: updateGroupDto.type ?? undefined,
                parentGroupId: updateGroupDto.parentGroupId === undefined
                    ? undefined
                    : (updateGroupDto.parentGroupId ?? null),
                location: updateGroupDto.location ?? undefined,
                timezone: updateGroupDto.timezone ?? undefined,
                headcountCap: updateGroupDto.headcountCap === undefined
                    ? undefined
                    : (updateGroupDto.headcountCap ?? null),
                updatedAt: (0, drizzle_orm_1.sql) `now()`,
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(this.table.id, groupId), (0, drizzle_orm_1.eq)(this.table.companyId, companyId)))
                .execute();
        });
        const [updatedGroup] = await this.db
            .select()
            .from(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.id, groupId))
            .limit(1)
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'Group',
            details: 'Updated group',
            userId,
            entityId: groupId,
            ipAddress: ip,
            changes: {
                name: { before: base.name, after: updatedGroup?.name },
                companyId: { before: base.companyId, after: base.companyId },
            },
        });
        await this.cache.bumpCompanyVersion(companyId);
        return updatedGroup;
    }
    async remove(id, user) {
        const group = await this.getGroupOrThrow(id);
        await this.db.delete(this.table).where((0, drizzle_orm_1.eq)(this.table.id, id)).execute();
        await this.auditService.logAction({
            action: 'deleted',
            details: 'Deleted group',
            entity: 'Group',
            userId: user.id,
            entityId: id,
        });
        await this.cache.bumpCompanyVersion(group.companyId);
        return 'Group deleted successfully';
    }
    async removeMembers(groupId, body, user, ip) {
        const { id: userId, companyId } = user;
        const group = await this.getGroupOrThrow(groupId);
        this.assertSameCompany(group.companyId, companyId);
        const members = this.normalizeAddMembers(body);
        const ids = members.map((m) => m.employeeId);
        if (!ids.length) {
            return { message: 'No members to remove', members: [] };
        }
        const existing = await this.db
            .select({ employeeId: this.tableMembers.employeeId })
            .from(this.tableMembers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(this.tableMembers.groupId, groupId), (0, drizzle_orm_1.inArray)(this.tableMembers.employeeId, ids)))
            .execute();
        if (existing.length === 0) {
            throw new common_1.BadRequestException(`Members do not exist in group ${groupId}`);
        }
        await this.db
            .delete(this.tableMembers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(this.tableMembers.groupId, groupId), (0, drizzle_orm_1.inArray)(this.tableMembers.employeeId, ids)))
            .execute();
        await this.auditService.logAction({
            action: 'deleted',
            details: 'Removed members from group',
            entity: 'Group',
            userId,
            entityId: groupId,
            ipAddress: ip,
            changes: { members: { before: existing, after: ids } },
        });
        await this.cache.bumpCompanyVersion(group.companyId);
        return { message: 'Members removed successfully', members: ids };
    }
};
exports.GroupsService = GroupsService;
exports.GroupsService = GroupsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        cache_service_1.CacheService])
], GroupsService);
//# sourceMappingURL=groups.service.js.map