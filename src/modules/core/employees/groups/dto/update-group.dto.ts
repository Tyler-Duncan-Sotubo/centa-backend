/** Update group/team details */

import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { GroupType, CreateGroupMemberDto } from './create-group.dto';

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  slug?: string;

  @IsOptional()
  @IsEnum(GroupType)
  type?: GroupType;

  @IsOptional()
  @IsUUID()
  parentGroupId?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsInt()
  headcountCap?: number;

  /** Replace or update members in one request */
  @IsOptional()
  members?: CreateGroupMemberDto[];
}
