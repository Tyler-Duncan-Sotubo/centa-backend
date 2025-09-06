import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Body,
  Patch,
  SetMetadata,
  Ip,
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdateCompanyPermissionsDto } from './dto/update-company-permission.dto';
import { BaseController } from 'src/common/interceptor/base.controller';
import { Permission } from './permission-keys';

@Controller('permissions')
export class PermissionsController extends BaseController {
  constructor(private readonly permissionsService: PermissionsService) {
    super();
  }

  @Post('seed')
  seedPermissions() {
    return this.permissionsService.create();
  }

  @Post('sync')
  syncAllCompanyPermissions() {
    return this.permissionsService.syncAllCompanyPermissions();
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', [Permission.PermissionsRead])
  findAllPermissions() {
    return this.permissionsService.findAll();
  }

  // Company Roles
  @Get('company/roles')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', [Permission.RolesRead])
  findAllCompanyRoles(@CurrentUser() user: User) {
    return this.permissionsService.getRolesByCompany(user.companyId);
  }

  @Post('company/roles')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', [Permission.RolesManage])
  createCompanyRole(@CurrentUser() user: User, @Body('name') name: string) {
    return this.permissionsService.createRole(user.companyId, name);
  }

  @Patch('company/roles/:roleId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', [Permission.RolesManage])
  findCompanyRoleById(
    @CurrentUser() user: User,
    @Param('roleId') roleId: string,
    @Body('name') name: string,
  ) {
    return this.permissionsService.updateRole(user.companyId, roleId, name);
  }

  // Company Permissions
  @Post('company/sync')
  async syncCompanyPermissions() {
    return this.permissionsService.syncAllCompanyPermissions();
  }

  @Post('assign')
  @SetMetadata('permissions', [Permission.PermissionsManage])
  @UseGuards(JwtAuthGuard)
  assignPermissionToRole(
    @CurrentUser() user: User,
    @Body() dto: CreatePermissionDto,
  ) {
    return this.permissionsService.assignPermissionToRole(
      user.companyId,
      dto.roleId,
      dto.permissionId,
    );
  }

  @Get('company-all')
  @SetMetadata('permissions', [Permission.PermissionsRead])
  @UseGuards(JwtAuthGuard)
  findAllUserPermissions(@CurrentUser() user: User) {
    return this.permissionsService.getCompanyPermissionsSummary(user.companyId);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', [Permission.PermissionsManage])
  async updatePermissions(
    @CurrentUser() user: User,
    @Body() body: UpdateCompanyPermissionsDto,
    @Ip() ip: string,
  ) {
    const { rolePermissions } = body;
    await this.permissionsService.updateCompanyRolePermissions(
      rolePermissions,
      user,
      ip,
    );
    return { message: 'Permissions updated successfully' };
  }
}
