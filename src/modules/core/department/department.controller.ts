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
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { Audit } from 'src/modules/audit/audit.decorator';
import { AuditInterceptor } from 'src/modules/audit/audit.interceptor';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { AssignHeadDto } from './dto/assign-head.dto';
import { AssignCostCenterDto } from './dto/assign-cost-center.dto';
import { AssignParentDto } from './dto/assign-parent.dto';
import { BaseController } from 'src/common/interceptor/base.controller';
import { FileParseInterceptor } from 'src/common/interceptor/file-parse.interceptor';
import { DepartmentWriteService } from './department-write.service';

@UseInterceptors(AuditInterceptor)
@Controller('department')
export class DepartmentController extends BaseController {
  constructor(
    private readonly departmentService: DepartmentService,
    private readonly departmentWriteService: DepartmentWriteService,
  ) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['department.manage'])
  @Audit({
    action: 'Create',
    entity: 'Department',
    getEntityId: (req) => req.params.id,
  })
  create(
    @CurrentUser() user: User,
    @Body() createDepartmentDto: CreateDepartmentDto,
  ) {
    return this.departmentService.create(user.companyId, createDepartmentDto);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['department.manage'])
  @Audit({ action: 'Department Bulk Up', entity: 'Departments' })
  @UseInterceptors(FileParseInterceptor({ field: 'file', maxRows: 200 }))
  async bulkCreate(@Body() rows: any[], @CurrentUser() user: User) {
    return this.departmentWriteService.bulkCreate(user.companyId, rows);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['department.read'])
  findAll(@CurrentUser() user: User) {
    return this.departmentService.findAll(user.companyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['department.read'])
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.departmentService.findOne(user.companyId, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['department.manage'])
  update(
    @Param('id') id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.departmentService.update(
      user.companyId,
      id,
      updateDepartmentDto,
      user.id,
      ip,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['department.manage'])
  @Audit({
    action: 'Delete',
    entity: 'Department',
    getEntityId: (req) => req.params.id,
  })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.departmentService.remove(user.companyId, id);
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['department.manage'])
  @Patch('/:id/head')
  assignHead(
    @Param('id') id: string,
    @Body() dto: AssignHeadDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.departmentService.assignHead(
      user.companyId,
      id,
      dto.headId,
      user.id,
      ip,
    );
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['department.read'])
  @Get('head/:id')
  getDepartmentHead(@Param('id') id: string, @CurrentUser() user: User) {
    return this.departmentService.findOneWithHead(user.companyId, id);
  }

  @Patch(':id/parent')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['department.manage'])
  assignParent(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: AssignParentDto,
    @Ip() ip: string,
  ) {
    return this.departmentService.assignParent(
      user.companyId,
      id,
      dto,
      user.id,
      ip,
    );
  }

  @Patch(':id/cost-center')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['department.manage'])
  assignCostCenter(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: AssignCostCenterDto,
    @Ip() ip: string,
  ) {
    return this.departmentService.assignCostCenter(
      user.companyId,
      id,
      dto,
      user.id,
      ip,
    );
  }

  @Get('/hierarchy/dept')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['department.hierarchy'])
  @Audit({ action: 'GetDepartmentHierarchy', entity: 'Department' })
  getHierarchy(@CurrentUser() user: User) {
    return this.departmentService.getHierarchy(user.companyId);
  }
}
