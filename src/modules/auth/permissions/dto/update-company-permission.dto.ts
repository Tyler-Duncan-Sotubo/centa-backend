import { IsObject } from 'class-validator';

export class UpdateCompanyPermissionsDto {
  @IsObject()
  rolePermissions: Record<
    string, // roleId
    string[] // permissionIds
  >;
}
