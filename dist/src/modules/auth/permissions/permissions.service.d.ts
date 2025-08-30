import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import { User } from 'src/common/types/user.type';
import { AuditService } from 'src/modules/audit/audit.service';
export declare class PermissionsService {
    private db;
    private readonly cache;
    private readonly auditService;
    constructor(db: db, cache: CacheService, auditService: AuditService);
    create(): Promise<string>;
    findAll(): Promise<{
        id: string;
        key: string;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        key: string;
    }>;
    createRole(companyId: string, name: string): Promise<{
        name: string;
        id: string;
        companyId: string;
    }>;
    createDefaultRoles(companyId: string): Promise<{
        name: string;
        id: string;
        companyId: string;
    }[]>;
    getRolesByCompany(companyId: string): Promise<{
        id: string;
        name: string;
    }[]>;
    updateRole(companyId: string, roleId: string, name: string): Promise<{
        id: string;
        companyId: string;
        name: string;
    }>;
    private findRoleByName;
    private findRoleById;
    assignPermissionToRole(companyId: string, roleId: string, permissionId: string): Promise<{
        id: string;
        companyRoleId: string;
        permissionId: string;
    }>;
    seedDefaultPermissionsForCompany(companyId: string): Promise<void>;
    syncAllCompanyPermissions(): Promise<void>;
    getLoginPermissionsByRole(companyId: string, roleId: string): Promise<{
        key: string;
    }[]>;
    getPermissionsByRole(companyId: string, roleId: string): Promise<{
        key: string;
    }[]>;
    getPermissionsForUser(user: User): Promise<{
        key: string;
    }[]>;
    getPermissionKeysForUser(roleId: string): Promise<string[]>;
    getCompanyPermissionsSummary(companyId: string): Promise<{
        roles: {
            id: string;
            name: string;
        }[];
        permissions: {
            id: string;
            key: string;
        }[];
        rolePermissions: Record<string, string[]>;
    }>;
    updateCompanyRolePermissions(rolePermissions: Record<string, string[]>, user: User, ip: string): Promise<void>;
}
