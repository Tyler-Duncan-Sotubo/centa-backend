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
import { CertificationsService } from './certifications.service';
import { CreateCertificationDto } from './dto/create-certification.dto';
import { UpdateCertificationDto } from './dto/update-certification.dto';
import { Audit } from 'src/modules/audit/audit.decorator';
import { AuditInterceptor } from 'src/modules/audit/audit.interceptor';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';

@UseInterceptors(AuditInterceptor)
@Controller('employee-certifications')
export class CertificationsController extends BaseController {
  constructor(private readonly certificationsService: CertificationsService) {
    super();
  }

  @Post(':employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  create(
    @Param('employeeId') employeeId: string,
    @Body() dto: CreateCertificationDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.certificationsService.create(employeeId, dto, user.id, ip);
  }

  @Get(':id/all-certifications')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  findAll(@Param('id') id: string) {
    return this.certificationsService.findAll(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  findOne(@Param('id') id: string) {
    return this.certificationsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCertificationDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.certificationsService.update(id, dto, user.id, ip);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  @Audit({
    action: 'Delete',
    entity: 'Employee Certification',
    getEntityId: (req) => req.params.id,
  })
  remove(@Param('id') id: string) {
    return this.certificationsService.remove(id);
  }
}
