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
    async create(createGroupDto, user, ip) {
        const { companyId, id } = user;
        const [group] = await this.db
            .select()
            .from(this.table)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(this.table.name, createGroupDto.name), (0, drizzle_orm_1.eq)(this.table.companyId, companyId)))
            .execute();
        if (group) {
            throw new common_1.BadRequestException(`Group with name ${createGroupDto.name} already exists`);
        }
        const [newGroup] = await this.db
            .insert(this.table)
            .values({ ...createGroupDto, companyId })
            .returning()
            .execute();
        const members = createGroupDto.employeeIds.map((employeeId) => ({
            groupId: newGroup.id,
            employeeId,
        }));
        await this.db.insert(this.tableMembers).values(members).execute();
        await this.auditService.logAction({
            action: 'create',
            entity: 'Group',
            details: 'Created new group',
            userId: id,
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
    async addMembers(groupId, employeeIds, user, ip) {
        const { id } = user;
        const group = await this.findGroup(groupId);
        const members = employeeIds.memberIds.map((employeeId) => ({
            groupId,
            employeeId,
        }));
        const existingMembers = await this.db
            .select()
            .from(this.tableMembers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(this.tableMembers.groupId, groupId), (0, drizzle_orm_1.eq)(this.tableMembers.groupId, groupId), (0, drizzle_orm_1.inArray)(this.tableMembers.employeeId, employeeIds.memberIds)))
            .execute();
        if (existingMembers.length > 0) {
            throw new common_1.BadRequestException(`Members already exist in group ${groupId}`);
        }
        await this.db.insert(this.tableMembers).values(members).execute();
        await this.auditService.logAction({
            action: 'create',
            entity: 'Group',
            details: 'Added members to group',
            userId: id,
            entityId: groupId,
            ipAddress: ip,
            changes: { members: { before: null, after: employeeIds } },
        });
        await this.cache.bumpCompanyVersion(group.companyId);
        return { message: 'Members added successfully', members };
    }
    async findAll(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['groups', 'list', 'all'], async () => {
            const rows = await this.db
                .select({
                id: this.table.id,
                name: this.table.name,
                createdAt: this.table.createdAt,
                members: (0, drizzle_orm_1.count)(this.tableMembers.groupId).as('memberCount'),
            })
                .from(this.table)
                .leftJoin(this.tableMembers, (0, drizzle_orm_1.eq)(this.tableMembers.groupId, this.table.id))
                .where((0, drizzle_orm_1.eq)(this.table.companyId, companyId))
                .groupBy(this.table.id)
                .orderBy((0, drizzle_orm_1.desc)(this.table.createdAt))
                .execute();
            return rows;
        }, { tags: this.tags(companyId) });
    }
    async findOne(id) {
        const base = await this.findGroup(id);
        return this.cache.getOrSetVersioned(base.companyId, ['groups', 'detail', id], async () => {
            const members = await this.db
                .select()
                .from(this.tableMembers)
                .where((0, drizzle_orm_1.eq)(this.tableMembers.groupId, id))
                .execute();
            const memberIds = members.map((m) => m.employeeId);
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
            return { ...base, members: employeesDetails };
        }, { tags: this.tags(base.companyId) });
    }
    async findEmployeesGroups(employeeId) {
        return this.cache.getOrSetVersioned(employeeId, ['groups', 'byEmployee', employeeId], async () => {
            const rows = await this.db
                .select({
                id: this.table.id,
                name: this.table.name,
            })
                .from(this.tableMembers)
                .innerJoin(this.table, (0, drizzle_orm_1.eq)(this.tableMembers.employeeId, employeeId))
                .execute();
            return rows;
        }, { tags: this.tags(employeeId) });
    }
    async update(groupId, updateGroupDto, user, ip) {
        const { companyId, id } = user;
        await this.findGroup(groupId);
        const members = (updateGroupDto.employeeIds ?? []).map((employeeId) => ({
            groupId,
            employeeId,
        }));
        for (const member of members) {
            const exists = await this.db
                .select()
                .from(this.tableMembers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(this.tableMembers.groupId, member.groupId), (0, drizzle_orm_1.eq)(this.tableMembers.employeeId, member.employeeId)))
                .limit(1)
                .execute();
            if (exists.length > 0) {
                await this.db
                    .update(this.tableMembers)
                    .set(member)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(this.tableMembers.groupId, member.groupId), (0, drizzle_orm_1.eq)(this.tableMembers.employeeId, member.employeeId)))
                    .execute();
            }
            else {
                await this.db.insert(this.tableMembers).values(member).execute();
            }
        }
        const [updatedGroup] = await this.db
            .update(this.table)
            .set({ ...updateGroupDto })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(this.table.id, groupId), (0, drizzle_orm_1.eq)(this.table.companyId, companyId)))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'Group',
            details: 'Updated group',
            userId: id,
            entityId: updatedGroup.id,
            ipAddress: ip,
            changes: {
                name: { before: null, after: updatedGroup.name },
                companyId: { before: null, after: updatedGroup.companyId },
            },
        });
        await this.cache.bumpCompanyVersion(companyId);
        return updatedGroup;
    }
    async remove(id) {
        const group = await this.findGroup(id);
        await this.db
            .delete(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.id, id))
            .returning()
            .execute();
        await this.cache.bumpCompanyVersion(group.companyId);
        return 'Group deleted successfully';
    }
    async removeMembers(groupId, employeeId, user, ip) {
        const { id } = user;
        const group = await this.findGroup(groupId);
        const existingMembers = await this.db
            .select()
            .from(this.tableMembers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(this.tableMembers.groupId, groupId), (0, drizzle_orm_1.inArray)(this.tableMembers.employeeId, employeeId.memberIds)))
            .execute();
        if (existingMembers.length === 0) {
            throw new common_1.BadRequestException(`Members do not exist in group ${groupId}`);
        }
        await this.db
            .delete(this.tableMembers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(this.tableMembers.groupId, groupId), (0, drizzle_orm_1.inArray)(this.tableMembers.employeeId, employeeId.memberIds)))
            .execute();
        await this.auditService.logAction({
            action: 'deleted',
            details: 'Removed members from group',
            entity: 'Group',
            userId: id,
            entityId: groupId,
            ipAddress: ip,
            changes: { members: { before: null, after: employeeId } },
        });
        await this.cache.bumpCompanyVersion(group.companyId);
        return { message: 'Members removed successfully', members: employeeId };
    }
    async findGroup(id) {
        const [group] = await this.db
            .select({
            id: this.table.id,
            name: this.table.name,
            companyId: this.table.companyId,
        })
            .from(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.id, id))
            .execute();
        if (!group) {
            throw new common_1.BadRequestException('Group not found');
        }
        return group;
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