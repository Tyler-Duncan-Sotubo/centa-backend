import { Controller, Get, SetMetadata, UseGuards } from '@nestjs/common';
import { OrgChartService } from './org-chart.service';
import { BaseController } from 'src/common/interceptor/base.controller';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@Controller('org-chart')
export class OrgChartController extends BaseController {
  constructor(private readonly orgChartService: OrgChartService) {
    super();
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  async getOrgChart(@CurrentUser() user: User) {
    return this.orgChartService.buildOrgChart(user.companyId);
  }
}
