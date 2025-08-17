import {
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsEnum,
  Length,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';

export enum GroupType {
  TEAM = 'TEAM',
  PROJECT = 'PROJECT',
  INTEREST = 'INTEREST',
  SECURITY = 'SECURITY',
}

export enum MemberRole {
  MEMBER = 'member',
  LEAD = 'lead',
  MANAGER = 'manager',
  CONTRACTOR = 'contractor',
}

/** Create a new group/team */
export class CreateGroupDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  slug?: string;

  @IsOptional()
  @IsEnum(GroupType)
  type?: GroupType = GroupType.TEAM;

  @IsOptional()
  @IsUUID()
  parentGroupId?: string;

  /** Optional metadata */
  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsInt()
  headcountCap?: number;

  /** Initial members */
  @IsOptional()
  members?: CreateGroupMemberDto[];
}

/** Add or update a single group member */
export class CreateGroupMemberDto {
  @IsUUID()
  employeeId!: string;

  @IsOptional()
  @IsEnum(MemberRole)
  role?: MemberRole = MemberRole.MEMBER;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean = false;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  title?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  allocationPct?: number;
}

/** Bulk add members to an existing group */
export class AddGroupMembersDto {
  members!: CreateGroupMemberDto[];
}
