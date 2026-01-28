import { Controller, Get, Param, SetMetadata, UseGuards } from '@nestjs/common';
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
  async getOrgChartRoots(@CurrentUser() user: User) {
    return this.orgChartService.getRoots(user.companyId);
  }

  @Get('preview/:depth')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  async getPreview(@CurrentUser() user: User, @Param('depth') depth: string) {
    return this.orgChartService.getPreview(user.companyId, Number(depth) || 4);
  }

  @Get('children/:managerId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  async getOrgChartChildren(
    @CurrentUser() user: User,
    @Param('managerId') managerId: string,
  ) {
    return this.orgChartService.getChildren(user.companyId, managerId);
  }

  // ✅ Employee-focused org chart (chain + direct reports)
  @Get('employee/:employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  async getEmployeeOrgChart(
    @CurrentUser() user: User,
    @Param('employeeId') employeeId: string,
  ) {
    return this.orgChartService.getEmployeeOrgChart(user.companyId, employeeId);
  }
}
