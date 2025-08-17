export declare enum GroupType {
    TEAM = "TEAM",
    PROJECT = "PROJECT",
    INTEREST = "INTEREST",
    SECURITY = "SECURITY"
}
export declare enum MemberRole {
    MEMBER = "member",
    LEAD = "lead",
    MANAGER = "manager",
    CONTRACTOR = "contractor"
}
export declare class CreateGroupDto {
    name: string;
    slug?: string;
    type?: GroupType;
    parentGroupId?: string;
    location?: string;
    timezone?: string;
    headcountCap?: number;
    members?: CreateGroupMemberDto[];
}
export declare class CreateGroupMemberDto {
    employeeId: string;
    role?: MemberRole;
    isPrimary?: boolean;
    title?: string;
    startDate?: string;
    endDate?: string;
    allocationPct?: number;
}
export declare class AddGroupMembersDto {
    members: CreateGroupMemberDto[];
}
