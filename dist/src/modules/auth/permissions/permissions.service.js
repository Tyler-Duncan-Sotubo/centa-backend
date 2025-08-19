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
exports.PermissionsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../schema");
const drizzle_orm_1 = require("drizzle-orm");
const cache_service_1 = require("../../../common/cache/cache.service");
const permission_keys_1 = require("./permission-keys");
const audit_service_1 = require("../../audit/audit.service");
const schema_2 = require("../../../drizzle/schema");
let PermissionsService = class PermissionsService {
    constructor(db, cache, auditService) {
        this.db = db;
        this.cache = cache;
        this.auditService = auditService;
    }
    create() {
        return this.db.transaction(async (tx) => {
            const existingPermissions = await tx
                .select()
                .from(schema_1.permissions)
                .where((0, drizzle_orm_1.inArray)(schema_1.permissions.key, [...permission_keys_1.PermissionKeys]));
            const existingKeys = new Set(existingPermissions.map((p) => p.key));
            const newPermissions = permission_keys_1.PermissionKeys.filter((key) => !existingKeys.has(key)).map((key) => ({ key }));
            if (newPermissions.length > 0) {
                await tx.insert(schema_1.permissions).values(newPermissions);
            }
            const cacheKey = 'permissions:all';
            await this.cache.del(cacheKey);
            return 'Permissions created or updated successfully';
        });
    }
    findAll() {
        const cacheKey = 'permissions:all';
        return this.cache.getOrSetCache(cacheKey, async () => {
            return this.db.select().from(schema_1.permissions).execute();
        });
    }
    async findOne(id) {
        const cacheKey = `permissions:${id}`;
        return this.cache.getOrSetCache(cacheKey, async () => {
            const permission = await this.db
                .select()
                .from(schema_1.permissions)
                .where((0, drizzle_orm_1.eq)(schema_1.permissions.id, id))
                .execute();
            if (permission.length === 0) {
                throw new common_1.NotFoundException(`Permission not found`);
            }
            return permission[0];
        });
    }
    async createRole(companyId, name) {
        const existingRole = await this.db
            .select()
            .from(schema_1.companyRoles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.companyRoles.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.companyRoles.name, name)))
            .execute();
        if (existingRole.length > 0) {
            throw new common_1.NotFoundException(`Role ${name} already exists for company ${companyId}`);
        }
        const [role] = await this.db
            .insert(schema_1.companyRoles)
            .values({ companyId, name })
            .returning();
        await this.cache.del(`company_roles:${companyId}`);
        await this.cache.del(`company_permissions_summary:${companyId}`);
        return role;
    }
    async createDefaultRoles(companyId) {
        const defaultRoles = [
            'super_admin',
            'hr_manager',
            'payroll_specialist',
            'finance_officer',
            'employee',
            'manager',
            'admin',
            'recruiter',
        ];
        const insertedRoles = await this.db
            .insert(schema_1.companyRoles)
            .values(defaultRoles.map((name) => ({ companyId, name })))
            .returning();
        await this.cache.del(`company_roles:${companyId}`);
        await this.cache.del(`company_permissions_summary:${companyId}`);
        return insertedRoles;
    }
    async getRolesByCompany(companyId) {
        const cacheKey = `company_roles:${companyId}`;
        return this.cache.getOrSetCache(cacheKey, async () => {
            return this.db
                .select({
                id: schema_1.companyRoles.id,
                name: schema_1.companyRoles.name,
            })
                .from(schema_1.companyRoles)
                .where((0, drizzle_orm_1.eq)(schema_1.companyRoles.companyId, companyId))
                .execute();
        });
    }
    async updateRole(companyId, roleId, name) {
        const role = await this.findRoleById(companyId, roleId);
        const [updatedRole] = await this.db
            .update(schema_1.companyRoles)
            .set({ name })
            .where((0, drizzle_orm_1.eq)(schema_1.companyRoles.id, role.id))
            .returning();
        await this.cache.del(`company_roles:${companyId}`);
        await this.cache.del(`company_permissions_summary:${companyId}`);
        return updatedRole;
    }
    async findRoleByName(companyId, name) {
        return this.db.query.companyRoles.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.companyRoles.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.companyRoles.name, name)),
        });
    }
    async findRoleById(companyId, roleId) {
        const role = await this.db.query.companyRoles.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.companyRoles.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.companyRoles.id, roleId)),
        });
        if (!role) {
            throw new common_1.NotFoundException(`Role not found for company ${companyId}`);
        }
        return role;
    }
    async assignPermissionToRole(companyId, roleId, permissionId) {
        await this.findRoleById(companyId, roleId);
        await this.findOne(permissionId);
        const already = await this.db
            .select()
            .from(schema_1.companyRolePermissions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.companyRolePermissions.companyRoleId, roleId), (0, drizzle_orm_1.eq)(schema_1.companyRolePermissions.permissionId, permissionId)))
            .execute();
        if (already.length > 0) {
            throw new common_1.BadRequestException(`Permission ${permissionId} is already assigned to role ${roleId}`);
        }
        const [assignment] = await this.db
            .insert(schema_1.companyRolePermissions)
            .values({
            companyRoleId: roleId,
            permissionId,
        })
            .returning();
        const cacheKey = `company_roles:${companyId}`;
        await this.cache.del(cacheKey);
        await this.cache.del(`role_permissions:${roleId}`);
        await this.cache.del(`company_permissions_summary:${companyId}`);
        return assignment;
    }
    async seedDefaultPermissionsForCompany(companyId) {
        const roles = await this.getRolesByCompany(companyId);
        const existingRows = await this.db
            .select({
            roleId: schema_1.companyRolePermissions.companyRoleId,
            permId: schema_1.companyRolePermissions.permissionId,
        })
            .from(schema_1.companyRolePermissions)
            .innerJoin(schema_1.companyRoles, (0, drizzle_orm_1.eq)(schema_1.companyRoles.id, schema_1.companyRolePermissions.companyRoleId))
            .where((0, drizzle_orm_1.eq)(schema_1.companyRoles.companyId, companyId))
            .execute();
        const alreadySet = new Set();
        for (const r of existingRows) {
            const key = `${r.roleId}|${r.permId}`;
            alreadySet.add(key);
        }
        const allPermissions = await this.findAll();
        const permKeyToId = new Map(allPermissions.map((perm) => [perm.key, perm.id]));
        const toInsert = [];
        for (const role of roles) {
            const permittedKeys = permission_keys_1.DefaultRolePermissions[role.name] || [];
            for (const permissionKey of permittedKeys) {
                const permId = permKeyToId.get(permissionKey);
                if (!permId) {
                    continue;
                }
                const lookup = `${role.id}|${permId}`;
                if (alreadySet.has(lookup)) {
                    console.warn(`Skipping duplicate: ${lookup}`);
                }
                else {
                    toInsert.push({ roleId: role.id, permissionId: permId });
                }
            }
        }
        if (toInsert.length === 0) {
            return;
        }
        const CHUNK = 1000;
        for (let i = 0; i < toInsert.length; i += CHUNK) {
            const chunk = toInsert.slice(i, i + CHUNK);
            await this.db
                .insert(schema_1.companyRolePermissions)
                .values(chunk.map(({ roleId, permissionId }) => ({
                companyRoleId: roleId,
                permissionId,
            })))
                .onConflictDoNothing()
                .execute();
        }
        await this.cache.del(`company_roles:${companyId}`);
        for (const role of roles) {
            await this.cache.del(`role_permissions:${role.id}`);
        }
    }
    async syncAllCompanyPermissions() {
        const allCompanies = await this.db.select().from(schema_2.companies);
        for (const company of allCompanies) {
            await this.seedDefaultPermissionsForCompany(company.id);
        }
    }
    async getLoginPermissionsByRole(companyId, roleId) {
        await this.findRoleById(companyId, roleId);
        return this.db
            .select({ key: schema_1.permissions.key })
            .from(schema_1.companyRolePermissions)
            .innerJoin(schema_1.permissions, (0, drizzle_orm_1.eq)(schema_1.companyRolePermissions.permissionId, schema_1.permissions.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.companyRolePermissions.companyRoleId, roleId), (0, drizzle_orm_1.inArray)(schema_1.permissions.key, ['ess.login', 'dashboard.login'])))
            .execute();
    }
    async getPermissionsByRole(companyId, roleId) {
        await this.findRoleById(companyId, roleId);
        const cacheKey = `role_permissions:${companyId}:${roleId}`;
        return this.cache.getOrSetCache(cacheKey, async () => {
            return this.db
                .select({ key: schema_1.permissions.key })
                .from(schema_1.companyRolePermissions)
                .innerJoin(schema_1.permissions, (0, drizzle_orm_1.eq)(schema_1.companyRolePermissions.permissionId, schema_1.permissions.id))
                .where((0, drizzle_orm_1.eq)(schema_1.companyRolePermissions.companyRoleId, roleId))
                .execute();
        });
    }
    async getPermissionsForUser(user) {
        const cacheKey = `user_permissions:${user.companyId}:${user.id}`;
        return this.cache.getOrSetCache(cacheKey, async () => {
            const user = await this.db.query.users.findFirst({
                where: (0, drizzle_orm_1.eq)(schema_1.users.id, schema_1.users.id),
            });
            if (!user)
                return [];
            return this.getPermissionsByRole(user.companyId, user.companyRoleId);
        });
    }
    async getPermissionKeysForUser(roleId) {
        const cacheKey = `role_permissions:${roleId}`;
        return await this.cache.getOrSetCache(cacheKey, async () => {
            const rolePermissions = await this.db
                .select({ permissionKey: schema_1.permissions.key })
                .from(schema_1.companyRolePermissions)
                .innerJoin(schema_1.permissions, (0, drizzle_orm_1.eq)(schema_1.companyRolePermissions.permissionId, schema_1.permissions.id))
                .where((0, drizzle_orm_1.eq)(schema_1.companyRolePermissions.companyRoleId, roleId));
            return rolePermissions.map((p) => p.permissionKey);
        });
    }
    async getCompanyPermissionsSummary(companyId) {
        const cacheKey = `company_permissions_summary:${companyId}`;
        return await this.cache.getOrSetCache(cacheKey, async () => {
            const roles = await this.db
                .select({
                id: schema_1.companyRoles.id,
                name: schema_1.companyRoles.name,
            })
                .from(schema_1.companyRoles)
                .where((0, drizzle_orm_1.eq)(schema_1.companyRoles.companyId, companyId))
                .execute();
            const allPermissions = await this.db
                .select({
                id: schema_1.permissions.id,
                key: schema_1.permissions.key,
            })
                .from(schema_1.permissions)
                .execute();
            const assigned = await this.db
                .select({
                roleId: schema_1.companyRolePermissions.companyRoleId,
                permissionId: schema_1.companyRolePermissions.permissionId,
            })
                .from(schema_1.companyRolePermissions)
                .innerJoin(schema_1.companyRoles, (0, drizzle_orm_1.eq)(schema_1.companyRoles.id, schema_1.companyRolePermissions.companyRoleId))
                .where((0, drizzle_orm_1.eq)(schema_1.companyRoles.companyId, companyId))
                .execute();
            const rolePermissions = {};
            for (const role of roles) {
                rolePermissions[role.id] = [];
            }
            for (const row of assigned) {
                if (rolePermissions[row.roleId]) {
                    rolePermissions[row.roleId].push(row.permissionId);
                }
            }
            return {
                roles,
                permissions: allPermissions,
                rolePermissions,
            };
        });
    }
    async updateCompanyRolePermissions(rolePermissions, user, ip) {
        const roles = await this.getRolesByCompany(user.companyId);
        for (const role of roles) {
            const permissionIds = rolePermissions[role.id] || [];
            await this.db
                .delete(schema_1.companyRolePermissions)
                .where((0, drizzle_orm_1.eq)(schema_1.companyRolePermissions.companyRoleId, role.id));
            if (permissionIds.length > 0) {
                await this.db.insert(schema_1.companyRolePermissions).values(permissionIds.map((permissionId) => ({
                    companyRoleId: role.id,
                    permissionId: permissionId,
                })));
            }
            await this.auditService.logAction({
                action: 'update',
                entity: 'permissions',
                entityId: role.id,
                userId: user.id,
                details: 'Updated permissions for role',
                ipAddress: ip,
                changes: {
                    roleId: role.id,
                    permissions: permissionIds,
                    companyId: user.companyId,
                    roleName: role.name,
                },
            });
            await this.cache.del(`role_permissions:${role.id}`);
        }
        await this.cache.del(`company_roles:${user.companyId}`);
    }
};
exports.PermissionsService = PermissionsService;
exports.PermissionsService = PermissionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService])
], PermissionsService);
//# sourceMappingURL=permissions.service.js.map