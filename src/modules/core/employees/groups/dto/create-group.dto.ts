import { IsString, IsUUID, Length } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsUUID('4', { each: true })
  @IsString({ each: true })
  employeeIds!: string[];
}

export class AddGroupMembersDto {
  @IsUUID('4', { each: true })
  memberIds!: string[];
}
