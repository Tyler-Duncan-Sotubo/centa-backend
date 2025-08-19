import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import {
  companyRolePermissions,
  companyRoles,
  permissions,
  users,
} from '../schema';
import { and, eq, inArray } from 'drizzle-orm';
import { CacheService } from 'src/common/cache/cache.service';
import { DefaultRolePermissions, PermissionKeys } from './permission-keys';
import { User } from 'src/common/types/user.type';
import { AuditService } from 'src/modules/audit/audit.service';
import { companies } from 'src/drizzle/schema';

@Injectable()
export class PermissionsService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly cache: CacheService,
    private readonly auditService: AuditService,
  ) {}

  // List of permission keys that are used in the application.
  create() {
    // Seed the permission keys into the database.
    return this.db.transaction(async (tx) => {
      const existingPermissions = await tx
        .select()
        .from(permissions)
        .where(inArray(permissions.key, [...PermissionKeys]));

      const existingKeys = new Set(existingPermissions.map((p) => p.key));

      const newPermissions = PermissionKeys.filter(
        (key) => !existingKeys.has(key),
      ).map((key) => ({ key }));

      if (newPermissions.length > 0) {
        await tx.insert(permissions).values(newPermissions);
      }

      // Update the cache after creating or updating permissions.
      const cacheKey = 'permissions:all';
      await this.cache.del(cacheKey);

      return 'Permissions created or updated successfully';
    });
  }

  findAll() {
    // Fetch all permissions from the database.
    const cacheKey = 'permissions:all';
    return this.cache.getOrSetCache(cacheKey, async () => {
      return this.db.select().from(permissions).execute();
    });
  }

  async findOne(id: string) {
    const cacheKey = `permissions:${id}`;

    return this.cache.getOrSetCache(cacheKey, async () => {
      const permission = await this.db
        .select()
        .from(permissions)
        .where(eq(permissions.id, id))
        .execute();

      if (permission.length === 0) {
        throw new NotFoundException(`Permission not found`);
      }

      return permission[0];
    });
    // Fetch a specific permission by its key.
  }

  // Company roles and permissions management ------------------------------------
  async createRole(companyId: string, name: string) {
    // Check if the role already exists
    const existingRole = await this.db
      .select()
      .from(companyRoles)
      .where(
        and(eq(companyRoles.companyId, companyId), eq(companyRoles.name, name)),
      )
      .execute();

    if (existingRole.length > 0) {
      throw new NotFoundException(
        `Role ${name} already exists for company ${companyId}`,
      );
    }

    const [role] = await this.db
      .insert(companyRoles)
      .values({ companyId, name })
      .returning();

    // Clear the cache for company roles after creating a new role.
    await this.cache.del(`company_roles:${companyId}`);
    await this.cache.del(`company_permissions_summary:${companyId}`);

    return role;
  }

  async createDefaultRoles(companyId: string) {
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
      .insert(companyRoles)
      .values(defaultRoles.map((name) => ({ companyId, name })))
      .returning();

    await this.cache.del(`company_roles:${companyId}`);
    await this.cache.del(`company_permissions_summary:${companyId}`);

    return insertedRoles;
  }

  async getRolesByCompany(companyId: string) {
    // Fetch all roles for a specific company.
    const cacheKey = `company_roles:${companyId}`;
    return this.cache.getOrSetCache(cacheKey, async () => {
      return this.db
        .select({
          id: companyRoles.id,
          name: companyRoles.name,
        })
        .from(companyRoles)
        .where(eq(companyRoles.companyId, companyId))
        .execute();
    });
  }

  async updateRole(companyId: string, roleId: string, name: string) {
    // Ensure the role exists
    const role = await this.findRoleById(companyId, roleId);

    // Update the role name
    const [updatedRole] = await this.db
      .update(companyRoles)
      .set({ name })
      .where(eq(companyRoles.id, role.id))
      .returning();

    // Clear the cache for company roles after updating a role.
    await this.cache.del(`company_roles:${companyId}`);
    await this.cache.del(`company_permissions_summary:${companyId}`);

    return updatedRole;
  }

  private async findRoleByName(companyId: string, name: string) {
    return this.db.query.companyRoles.findFirst({
      where: and(
        eq(companyRoles.companyId, companyId),
        eq(companyRoles.name, name),
      ),
    });
  }

  private async findRoleById(companyId: string, roleId: string) {
    const role = await this.db.query.companyRoles.findFirst({
      where: and(
        eq(companyRoles.companyId, companyId),
        eq(companyRoles.id, roleId),
      ),
    });

    if (!role) {
      throw new NotFoundException(`Role not found for company ${companyId}`);
    }

    return role;
  }

  //Company Role Permission Service ------------------------
  async assignPermissionToRole(
    companyId: string,
    roleId: string,
    permissionId: string,
  ) {
    // 1) Ensure the role exists (throws if not)
    await this.findRoleById(companyId, roleId);

    // 2) Ensure the permission exists (throws if not)
    await this.findOne(permissionId);

    // 3) Check if this (roleId, permissionId) is already in companyRolePermissions
    const already = await this.db
      .select()
      .from(companyRolePermissions)
      .where(
        and(
          eq(companyRolePermissions.companyRoleId, roleId),
          eq(companyRolePermissions.permissionId, permissionId),
        ),
      )
      .execute();

    if (already.length > 0) {
      throw new BadRequestException(
        `Permission ${permissionId} is already assigned to role ${roleId}`,
      );
    }

    // 4) Insert the new assignment
    const [assignment] = await this.db
      .insert(companyRolePermissions)
      .values({
        companyRoleId: roleId,
        permissionId,
      })
      .returning();

    // 5) Clear cache so next time we re‐fetch updated role→permission list
    const cacheKey = `company_roles:${companyId}`;
    await this.cache.del(cacheKey);
    await this.cache.del(`role_permissions:${roleId}`);
    await this.cache.del(`company_permissions_summary:${companyId}`);

    return assignment;
  }

  public async seedDefaultPermissionsForCompany(
    companyId: string,
  ): Promise<void> {
    const roles = await this.getRolesByCompany(companyId);
    // 2) Fetch existing (roleId, permId) pairs for this company, via a join:
    const existingRows = await this.db
      .select({
        roleId: companyRolePermissions.companyRoleId,
        permId: companyRolePermissions.permissionId,
      })
      .from(companyRolePermissions)
      .innerJoin(
        companyRoles,
        eq(companyRoles.id, companyRolePermissions.companyRoleId),
      )
      .where(eq(companyRoles.companyId, companyId))
      .execute();

    const alreadySet = new Set<string>();
    for (const r of existingRows) {
      const key = `${r.roleId}|${r.permId}`;
      alreadySet.add(key);
    }

    const allPermissions = await this.findAll();
    // 2) Build a Map<permissionKey, permissionId> for quick lookups:
    const permKeyToId = new Map<string, string>(
      allPermissions.map((perm) => [perm.key, perm.id]),
    );

    // 3) Determine which (roleId, permId) we still need to insert:
    const toInsert: Array<{ roleId: string; permissionId: string }> = [];
    for (const role of roles) {
      const permittedKeys = DefaultRolePermissions[role.name] || [];
      for (const permissionKey of permittedKeys) {
        const permId = permKeyToId.get(permissionKey);
        if (!permId) {
          continue;
        }
        const lookup = `${role.id}|${permId}`;

        if (alreadySet.has(lookup)) {
          console.warn(`Skipping duplicate: ${lookup}`);
        } else {
          toInsert.push({ roleId: role.id, permissionId: permId });
        }
      }
    }

    // 4) If nothing new, we’re done:
    if (toInsert.length === 0) {
      return;
    }

    // 5) Bulk‐insert missing links in chunks:
    const CHUNK = 1000;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const chunk = toInsert.slice(i, i + CHUNK);
      await this.db
        .insert(companyRolePermissions)
        .values(
          chunk.map(({ roleId, permissionId }) => ({
            companyRoleId: roleId,
            permissionId,
          })),
        )
        .onConflictDoNothing()
        .execute();
    }

    // 6) Clear cached role→permission lookups if needed:
    await this.cache.del(`company_roles:${companyId}`);
    for (const role of roles) {
      await this.cache.del(`role_permissions:${role.id}`);
    }
  }

  async syncAllCompanyPermissions() {
    const allCompanies = await this.db.select().from(companies);

    for (const company of allCompanies) {
      await this.seedDefaultPermissionsForCompany(company.id);
    }
  }

  async getLoginPermissionsByRole(companyId: string, roleId: string) {
    // ensure role exists
    await this.findRoleById(companyId, roleId);
    return this.db
      .select({ key: permissions.key })
      .from(companyRolePermissions)
      .innerJoin(
        permissions,
        eq(companyRolePermissions.permissionId, permissions.id),
      )
      .where(
        and(
          eq(companyRolePermissions.companyRoleId, roleId),
          inArray(permissions.key, ['ess.login', 'dashboard.login']), // 👈 filter only these
        ),
      )
      .execute();
  }

  async getPermissionsByRole(companyId: string, roleId: string) {
    // Fetch all permissions assigned to a specific role.
    await this.findRoleById(companyId, roleId);

    const cacheKey = `role_permissions:${companyId}:${roleId}`;
    return this.cache.getOrSetCache(cacheKey, async () => {
      return this.db
        .select({ key: permissions.key })
        .from(companyRolePermissions)
        .innerJoin(
          permissions,
          eq(companyRolePermissions.permissionId, permissions.id),
        )
        .where(eq(companyRolePermissions.companyRoleId, roleId))
        .execute();
    });
  }

  async getPermissionsForUser(user: User) {
    const cacheKey = `user_permissions:${user.companyId}:${user.id}`;
    return this.cache.getOrSetCache(cacheKey, async () => {
      const user = await this.db.query.users.findFirst({
        where: eq(users.id, users.id),
      });

      if (!user) return [];

      return this.getPermissionsByRole(user.companyId, user.companyRoleId);
    });
  }

  async getPermissionKeysForUser(roleId: string): Promise<string[]> {
    const cacheKey = `role_permissions:${roleId}`;

    // Fetch permissions assigned to this role
    return await this.cache.getOrSetCache(cacheKey, async () => {
      const rolePermissions = await this.db
        .select({ permissionKey: permissions.key })
        .from(companyRolePermissions)
        .innerJoin(
          permissions,
          eq(companyRolePermissions.permissionId, permissions.id),
        )
        .where(eq(companyRolePermissions.companyRoleId, roleId));

      return rolePermissions.map((p) => p.permissionKey);
    });
  }

  async getCompanyPermissionsSummary(companyId: string) {
    const cacheKey = `company_permissions_summary:${companyId}`;

    return await this.cache.getOrSetCache(cacheKey, async () => {
      // Fetch roles
      const roles = await this.db
        .select({
          id: companyRoles.id,
          name: companyRoles.name,
        })
        .from(companyRoles)
        .where(eq(companyRoles.companyId, companyId))
        .execute();

      // Fetch permissions
      const allPermissions = await this.db
        .select({
          id: permissions.id,
          key: permissions.key,
        })
        .from(permissions)
        .execute();

      // Fetch role-permission assignments
      const assigned = await this.db
        .select({
          roleId: companyRolePermissions.companyRoleId,
          permissionId: companyRolePermissions.permissionId,
        })
        .from(companyRolePermissions)
        .innerJoin(
          companyRoles,
          eq(companyRoles.id, companyRolePermissions.companyRoleId),
        )
        .where(eq(companyRoles.companyId, companyId))
        .execute();

      // Build rolePermissions map (roleId -> permissionIds)
      const rolePermissions: Record<string, string[]> = {};
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

  async updateCompanyRolePermissions(
    rolePermissions: Record<string, string[]>,
    user: User,
    ip: string,
  ) {
    const roles = await this.getRolesByCompany(user.companyId);

    for (const role of roles) {
      const permissionIds = rolePermissions[role.id] || [];

      // Clear existing role permissions
      await this.db
        .delete(companyRolePermissions)
        .where(eq(companyRolePermissions.companyRoleId, role.id));

      // Re-insert new permissions if any
      if (permissionIds.length > 0) {
        await this.db.insert(companyRolePermissions).values(
          permissionIds.map((permissionId) => ({
            companyRoleId: role.id,
            permissionId: permissionId,
          })),
        );
      }

      // log the audit event
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

      // Clear cache per role
      await this.cache.del(`role_permissions:${role.id}`);
    }

    await this.cache.del(`company_roles:${user.companyId}`);
  }
}
