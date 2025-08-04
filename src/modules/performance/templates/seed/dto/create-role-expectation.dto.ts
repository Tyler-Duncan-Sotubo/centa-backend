import { IsString, IsUUID } from 'class-validator';

export class CreateRoleExpectationDto {
  @IsString()
  roleId: string;

  @IsUUID()
  competencyId: string;

  @IsUUID()
  expectedLevelId: string;
}
