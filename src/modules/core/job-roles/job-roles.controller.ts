import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UseGuards,
  SetMetadata,
  Ip,
} from '@nestjs/common';
import { JobRolesService } from './job-roles.service';
import { CreateJobRoleDto } from './dto/create-job-role.dto';
import { UpdateJobRoleDto } from './dto/update-job-role.dto';
import { Audit } from 'src/modules/audit/audit.decorator';
import { AuditInterceptor } from 'src/modules/audit/audit.interceptor';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';
import { FileParseInterceptor } from 'src/common/interceptor/file-parse.interceptor';

@UseInterceptors(AuditInterceptor)
@Controller('job-roles')
export class JobRolesController extends BaseController {
  constructor(private readonly jobRolesService: JobRolesService) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['job_roles.manage'])
  @Audit({
    action: 'Create',
    entity: 'Job Role',
    getEntityId: (req) => req.params.id,
  })
  create(
    @Body() createJobRoleDto: CreateJobRoleDto,
    @CurrentUser() user: User,
  ) {
    return this.jobRolesService.create(user.companyId, createJobRoleDto);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['job_roles.manage'])
  @Audit({ action: 'BulkCreateJobRoles', entity: 'JobRole' })
  @UseInterceptors(FileParseInterceptor({ field: 'file', maxRows: 200 }))
  async bulkCreate(@Body() rows: any[], @CurrentUser() user: User) {
    return this.jobRolesService.bulkCreate(user.companyId, rows);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['job_roles.read'])
  findAll(@CurrentUser() user: User) {
    return this.jobRolesService.findAll(user.companyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['job_roles.read'])
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.jobRolesService.findOne(user.companyId, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['job_roles.manage'])
  update(
    @Param('id') id: string,
    @Body() updateJobRoleDto: UpdateJobRoleDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.jobRolesService.update(
      user.companyId,
      id,
      updateJobRoleDto,
      user.id,
      ip,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['job_roles.manage'])
  @Audit({
    action: 'Delete',
    entity: 'Job Role',
    getEntityId: (req) => req.params.id,
  })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.jobRolesService.remove(user.companyId, id);
  }
}
