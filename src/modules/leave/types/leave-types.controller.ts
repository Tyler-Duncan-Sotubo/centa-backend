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
import { Audit } from 'src/modules/audit/audit.decorator';
import { AuditInterceptor } from 'src/modules/audit/audit.interceptor';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto';
import { LeaveTypesService } from './leave-types.service';
import { FileParseInterceptor } from 'src/common/interceptor/file-parse.interceptor';

@UseInterceptors(AuditInterceptor)
@Controller('leave-types')
export class LeaveTypesController extends BaseController {
  constructor(private readonly leaveType: LeaveTypesService) {
    super();
  }

  @Post('')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.types.manage'])
  create(
    @Body() dto: CreateLeaveTypeDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.leaveType.create(dto, user, ip);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.types.manage'])
  @Audit({ action: 'bulk Create Leave Types', entity: 'CostCenter' })
  @UseInterceptors(FileParseInterceptor({ field: 'file', maxRows: 200 }))
  async bulkCreateLeaveTypes(@Body() rows: any[], @CurrentUser() user: User) {
    return this.leaveType.bulkCreateLeaveTypes(user.companyId, rows);
  }

  @Get('')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['leave.types.read'])
  findAll(@CurrentUser() user: User) {
    return this.leaveType.findAll(user.companyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['leave.types.read'])
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.leaveType.findOne(user.companyId, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.types.manage'])
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLeaveTypeDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.leaveType.update(id, dto, user, ip);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.types.manage'])
  @Audit({
    action: 'Delete',
    entity: 'leave',
    getEntityId: (req) => req.params.id,
  })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.leaveType.remove(user.companyId, id);
  }
}
