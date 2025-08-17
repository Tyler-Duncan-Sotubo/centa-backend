import { GroupType, CreateGroupMemberDto } from './create-group.dto';
export declare class UpdateGroupDto {
    name?: string;
    slug?: string;
    type?: GroupType;
    parentGroupId?: string;
    location?: string;
    timezone?: string;
    headcountCap?: number;
    members?: CreateGroupMemberDto[];
}
