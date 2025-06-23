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
import { HistoryService } from './history.service';
import { CreateHistoryDto } from './dto/create-history.dto';
import { UpdateHistoryDto } from './dto/update-history.dto';
import { Audit } from 'src/modules/audit/audit.decorator';
import { AuditInterceptor } from 'src/modules/audit/audit.interceptor';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';

@UseInterceptors(AuditInterceptor)
@Controller('employee-history')
export class HistoryController extends BaseController {
  constructor(private readonly historyService: HistoryService) {
    super();
  }

  @Post(':employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  create(
    @Param('employeeId') employeeId: string,
    @Body() dto: CreateHistoryDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.historyService.create(employeeId, dto, user.id, ip);
  }

  @Get(':id/all-history')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  findAll(@Param('id') id: string) {
    return this.historyService.findAll(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  findOne(@Param('id') id: string) {
    return this.historyService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  update(
    @Param('id') id: string,
    @Body() dto: UpdateHistoryDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.historyService.update(id, dto, user.id, ip);
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
    return this.historyService.remove(id);
  }
}
