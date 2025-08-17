import { GroupsService } from './groups.service';
import { AddGroupMembersDto, CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class GroupsController extends BaseController {
    private readonly groupsService;
    constructor(groupsService: GroupsService);
    create(createGroupDto: CreateGroupDto, user: User, ip: string): Promise<any>;
    addMembers(id: string, employeeIds: AddGroupMembersDto, user: User, ip: string): Promise<{
        message: string;
        members: any;
    }>;
    findAll(user: User): Promise<({
        id: any;
        name: any;
        type: any;
        parentGroupId: any;
        createdAt: any;
        members: number;
        leadEmployeeId: string | null;
        leadEmployeeName: string | null;
    } | {
        id: any;
        name: any;
        type: any;
        parentGroupId: any;
        createdAt: any;
        members: number;
        leadEmployeeId: string | null;
        leadEmployeeName: string | null;
    } | {
        id: any;
        name: any;
        type: any;
        parentGroupId: any;
        createdAt: any;
        members: number;
        leadEmployeeId: string | null;
        leadEmployeeName: string | null;
    } | {
        id: any;
        name: any;
        type: any;
        parentGroupId: any;
        createdAt: any;
        members: number;
        leadEmployeeId: string | null;
        leadEmployeeName: string | null;
    })[]>;
    findOne(id: string): Promise<{
        members: ({
            groupId: string;
            employeeId: string;
            role: "member" | "lead" | "manager" | "contractor";
            isPrimary: boolean;
            title: string | null;
            startDate: string | null;
            endDate: string | null;
            allocationPct: number | null;
            joinedAt: Date;
            updatedAt: Date;
            id: any;
            firstName: any;
            lastName: any;
            email: any;
        } | {
            groupId: string;
            employeeId: string;
            role: "member" | "lead" | "manager" | "contractor";
            isPrimary: boolean;
            title: string | null;
            startDate: string | null;
            endDate: string | null;
            allocationPct: number | null;
            joinedAt: Date;
            updatedAt: Date;
            id: any;
            firstName: any;
            lastName: any;
            email: any;
        })[];
        id: any;
        name: any;
        companyId: any;
    } | {
        members: ({
            groupId: string;
            employeeId: string;
            role: "member" | "lead" | "manager" | "contractor";
            isPrimary: boolean;
            title: string | null;
            startDate: string | null;
            endDate: string | null;
            allocationPct: number | null;
            joinedAt: Date;
            updatedAt: Date;
            id: any;
            firstName: any;
            lastName: any;
            email: any;
        } | {
            groupId: string;
            employeeId: string;
            role: "member" | "lead" | "manager" | "contractor";
            isPrimary: boolean;
            title: string | null;
            startDate: string | null;
            endDate: string | null;
            allocationPct: number | null;
            joinedAt: Date;
            updatedAt: Date;
            id: any;
            firstName: any;
            lastName: any;
            email: any;
        })[];
        id: any;
        name: any;
        companyId: any;
    }>;
    update(id: string, updateGroupDto: UpdateGroupDto, user: User, ip: string): Promise<{
        [x: string]: any;
    }>;
    remove(id: string, user: User): Promise<string>;
    removeMembers(id: string, employeeIds: AddGroupMembersDto, user: User, ip: string): Promise<{
        message: string;
        members: any;
    }>;
}
