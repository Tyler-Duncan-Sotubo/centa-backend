import { Controller, Get, SetMetadata, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { CurrentUser } from '../auth/decorator/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from 'src/types/user.type';
import { BaseController } from 'src/config/base.controller';

@Controller('')
export class AuditController extends BaseController {
  constructor(private readonly auditService: AuditService) {
    super();
  }

  @Get('audit-logs')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  async getAuditLogs(@CurrentUser() user: User) {
    return this.auditService.getAuditLogs(user.company_id);
  }
}
