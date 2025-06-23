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
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { Audit } from 'src/modules/audit/audit.decorator';
import { AuditInterceptor } from 'src/modules/audit/audit.interceptor';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';

@UseInterceptors(AuditInterceptor)
@Controller('employee-profile')
export class ProfileController extends BaseController {
  constructor(private readonly profileService: ProfileService) {
    super();
  }

  @Post(':employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  create(
    @Param('employeeId') employeeId: string,
    @Body() dto: CreateProfileDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.profileService.upsert(employeeId, dto, user.id, ip);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  findOne(@Param('id') id: string) {
    return this.profileService.findOne(id);
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
    return this.profileService.remove(id);
  }
}
