import { Controller, Get, SetMetadata, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { CurrentUser } from '../auth/decorator/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('audit')
export class AuditController extends BaseController {
  constructor(private readonly auditService: AuditService) {
    super();
  }

  @Get('logs')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['audit.logs.read'])
  async getAuditLogs(@CurrentUser() user: User) {
    return this.auditService.getAuditLogs(user.companyId);
  }

  @Get('authentication-logs')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['audit.auth.read'])
  async getAuthenticationLogs(@CurrentUser() user: User) {
    return this.auditService.getLoginAudit(user.companyId);
  }
}
