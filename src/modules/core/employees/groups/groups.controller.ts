import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseInterceptors,
  UseGuards,
  SetMetadata,
  Ip,
  Patch,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { AddGroupMembersDto, CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { Audit } from 'src/modules/audit/audit.decorator';
import { AuditInterceptor } from 'src/modules/audit/audit.interceptor';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';

@UseInterceptors(AuditInterceptor)
@Controller('employee-groups')
export class GroupsController extends BaseController {
  constructor(private readonly groupsService: GroupsService) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  create(
    @Body() createGroupDto: CreateGroupDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.groupsService.create(createGroupDto, user, ip);
  }

  @Post(':id/members')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  addMembers(
    @Param('id') id: string,
    @Body() employeeIds: AddGroupMembersDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.groupsService.addMembers(id, employeeIds, user, ip);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  findAll(@CurrentUser() user: User) {
    return this.groupsService.findAll(user.companyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  findOne(@Param('id') id: string) {
    return this.groupsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  update(
    @Param('id') id: string,
    @Body() updateGroupDto: UpdateGroupDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.groupsService.update(id, updateGroupDto, user, ip);
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  @Audit({
    action: 'DeleteGroup',
    entity: 'Group',
    getEntityId: (req) => req.params.id,
  })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.groupsService.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  @Delete(':id/members')
  removeMembers(
    @Param('id') id: string,
    @Body() employeeIds: AddGroupMembersDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.groupsService.removeMembers(id, employeeIds, user, ip);
  }
}
