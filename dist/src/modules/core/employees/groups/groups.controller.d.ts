import { GroupsService } from './groups.service';
import { AddGroupMembersDto, CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class GroupsController extends BaseController {
    private readonly groupsService;
    constructor(groupsService: GroupsService);
    create(createGroupDto: CreateGroupDto, user: User, ip: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
    }>;
    addMembers(id: string, employeeIds: AddGroupMembersDto, user: User, ip: string): Promise<{
        message: string;
        members: {
            groupId: string;
            employeeId: string;
        }[];
    }>;
    findAll(user: User): Promise<{
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
    update(id: string, updateGroupDto: UpdateGroupDto, user: User, ip: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
    }>;
    remove(id: string): Promise<string>;
    removeMembers(id: string, employeeIds: AddGroupMembersDto, user: User, ip: string): Promise<{
        message: string;
        members: AddGroupMembersDto;
    }>;
}
