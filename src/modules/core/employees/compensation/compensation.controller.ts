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
import { CompensationService } from './compensation.service';
import { CreateCompensationDto } from './dto/create-compensation.dto';
import { UpdateCompensationDto } from './dto/update-compensation.dto';
import { Audit } from 'src/modules/audit/audit.decorator';
import { AuditInterceptor } from 'src/modules/audit/audit.interceptor';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';

@UseInterceptors(AuditInterceptor)
@Controller('employee-compensation')
export class CompensationController extends BaseController {
  constructor(private readonly compensationService: CompensationService) {
    super();
  }

  @Post(':employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  create(
    @Param('employeeId') employeeId: string,
    @Body() dto: CreateCompensationDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.compensationService.upsert(employeeId, dto, user.id, ip);
  }

  @Get(':id/all')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  findAll(@Param('id') id: string) {
    return this.compensationService.findAll(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  findOne(@Param('id') id: string) {
    return this.compensationService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCompensationDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.compensationService.update(id, dto, user.id, ip);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  @Audit({
    action: 'Delete EmployeeCompensation',
    entity: 'EmployeeCompensation',
    getEntityId: (req) => req.params.id,
  })
  remove(@Param('id') id: string) {
    return this.compensationService.remove(id);
  }
}
