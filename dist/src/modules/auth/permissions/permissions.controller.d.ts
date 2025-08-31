import { PermissionsService } from './permissions.service';
import { User } from 'src/common/types/user.type';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdateCompanyPermissionsDto } from './dto/update-company-permission.dto';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class PermissionsController extends BaseController {
    private readonly permissionsService;
    constructor(permissionsService: PermissionsService);
    seedPermissions(): Promise<string>;
    findAllPermissions(): Promise<{
        id: string;
        key: string;
    }[]>;
    findAllCompanyRoles(user: User): Promise<{
        id: string;
        name: string;
    }[]>;
    createCompanyRole(user: User, name: string): Promise<{
        id: string;
        name: string;
        companyId: string;
    }>;
    findCompanyRoleById(user: User, roleId: string, name: string): Promise<{
        id: string;
        companyId: string;
        name: string;
    }>;
    syncCompanyPermissions(): Promise<void>;
    assignPermissionToRole(user: User, dto: CreatePermissionDto): Promise<{
        id: string;
        companyRoleId: string;
        permissionId: string;
    }>;
    findAllUserPermissions(user: User): Promise<{
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
    updatePermissions(user: User, body: UpdateCompanyPermissionsDto, ip: string): Promise<{
        message: string;
    }>;
}
