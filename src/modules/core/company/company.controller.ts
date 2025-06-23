import {
  Controller,
  Get,
  Body,
  Patch,
  Delete,
  UseInterceptors,
  UseGuards,
  SetMetadata,
  Ip,
  Param,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { Audit } from 'src/modules/audit/audit.decorator';
import { AuditInterceptor } from 'src/modules/audit/audit.interceptor';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';
import { UpdateCompanyDto } from './dto/update-company.dto';

@UseInterceptors(AuditInterceptor)
@Controller('company')
export class CompanyController extends BaseController {
  constructor(private readonly companyService: CompanyService) {
    super();
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['company.manage'])
  update(
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.companyService.update(user.companyId, dto, user.id, ip);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['company.read'])
  get(@CurrentUser() user: User) {
    return this.companyService.findOne(user.companyId);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['company.manage'])
  @Audit({
    action: 'Delete',
    entity: 'Company',
    getEntityId: (req) => req.params.id,
  })
  delete(@CurrentUser() user: User) {
    return this.companyService.softDelete(user.companyId);
  }

  @Get('summary')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['company.summary'])
  getCompanySummary(@CurrentUser() user: User) {
    return this.companyService.getCompanySummary(user.companyId);
  }

  @Get('employee-summary/:employeeId')
  @UseGuards(JwtAuthGuard)
  // @SetMetadata('permissions', ['company.summary'])
  getEmployeeSummary(@Param('employeeId') employeeId: string) {
    return this.companyService.getEmployeeSummary(employeeId);
  }

  @Get('company-elements')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['company.elements'])
  getCompanyElements(@CurrentUser() user: User) {
    return this.companyService.getCompanyElements(user.companyId);
  }
}
