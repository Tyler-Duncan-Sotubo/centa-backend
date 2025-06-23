import { AddGroupMembersDto, CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
export declare class GroupsService {
    private readonly db;
    private readonly auditService;
    protected table: import("drizzle-orm/pg-core").PgTableWithColumns<{
        name: "employee_groups";
        schema: undefined;
        columns: {
            id: import("drizzle-orm/pg-core").PgColumn<{
                name: "id";
                tableName: "employee_groups";
                dataType: "string";
                columnType: "PgUUID";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: true;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
            name: import("drizzle-orm/pg-core").PgColumn<{
                name: "name";
                tableName: "employee_groups";
                dataType: "string";
                columnType: "PgVarchar";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: 100;
            }>;
            createdAt: import("drizzle-orm/pg-core").PgColumn<{
                name: "created_at";
                tableName: "employee_groups";
                dataType: "date";
                columnType: "PgTimestamp";
                data: Date;
                driverParam: string;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
            updatedAt: import("drizzle-orm/pg-core").PgColumn<{
                name: "updated_at";
                tableName: "employee_groups";
                dataType: "date";
                columnType: "PgTimestamp";
                data: Date;
                driverParam: string;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
            companyId: import("drizzle-orm/pg-core").PgColumn<{
                name: "company_id";
                tableName: "employee_groups";
                dataType: "string";
                columnType: "PgUUID";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
        };
        dialect: "pg";
    }>;
    protected tableMembers: import("drizzle-orm/pg-core").PgTableWithColumns<{
        name: "employee_group_memberships";
        schema: undefined;
        columns: {
            groupId: import("drizzle-orm/pg-core").PgColumn<{
                name: "group_id";
                tableName: "employee_group_memberships";
                dataType: "string";
                columnType: "PgUUID";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
            employeeId: import("drizzle-orm/pg-core").PgColumn<{
                name: "employee_id";
                tableName: "employee_group_memberships";
                dataType: "string";
                columnType: "PgUUID";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
            joinedAt: import("drizzle-orm/pg-core").PgColumn<{
                name: "joined_at";
                tableName: "employee_group_memberships";
                dataType: "date";
                columnType: "PgTimestamp";
                data: Date;
                driverParam: string;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
        };
        dialect: "pg";
    }>;
    constructor(db: db, auditService: AuditService);
    create(createGroupDto: CreateGroupDto, user: User, ip: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
    }>;
    addMembers(groupId: string, employeeIds: AddGroupMembersDto, user: User, ip: string): Promise<{
        message: string;
        members: {
            groupId: string;
            employeeId: string;
        }[];
    }>;
    findAll(companyId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        members: number;
    }[]>;
    findOne(id: string): Promise<{
        members: ({
            id: any;
            firstName: any;
            lastName: any;
            email: any;
        } | {
            id: any;
            firstName: any;
            lastName: any;
            email: any;
        })[];
        id: string;
        name: string;
        companyId: string;
    }>;
    findEmployeesGroups(employeeId: string): Promise<{
        id: string;
        name: string;
    }[]>;
    update(groupId: string, updateGroupDto: UpdateGroupDto, user: User, ip: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
    }>;
    remove(id: string): Promise<string>;
    removeMembers(groupId: string, employeeId: AddGroupMembersDto, user: User, ip: string): Promise<{
        message: string;
        members: AddGroupMembersDto;
    }>;
    private findGroup;
}
