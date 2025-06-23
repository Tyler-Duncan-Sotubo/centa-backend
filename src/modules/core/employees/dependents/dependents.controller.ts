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
import { DependentsService } from './dependents.service';
import { CreateDependentDto } from './dto/create-dependent.dto';
import { UpdateDependentDto } from './dto/update-dependent.dto';
import { Audit } from 'src/modules/audit/audit.decorator';
import { AuditInterceptor } from 'src/modules/audit/audit.interceptor';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';

@UseInterceptors(AuditInterceptor)
@Controller('dependents')
export class DependentsController extends BaseController {
  constructor(private readonly dependentsService: DependentsService) {
    super();
  }

  @Post(':employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  create(
    @Param('employeeId') employeeId: string,
    @Body() dto: CreateDependentDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.dependentsService.create(employeeId, dto, user.id, ip);
  }

  @Get(':id/all-dependents')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  findAll(@Param('id') id: string) {
    return this.dependentsService.findAll(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  findOne(@Param('id') id: string) {
    return this.dependentsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDependentDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.dependentsService.update(id, dto, user.id, ip);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  @Audit({
    action: 'Delete',
    entity: 'EmployeeProfile',
    getEntityId: (req) => req.params.id,
  })
  remove(@Param('id') id: string) {
    return this.dependentsService.remove(id);
  }
}
