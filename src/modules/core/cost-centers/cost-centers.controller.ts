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
import { CostCentersService } from './cost-centers.service';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';
import { Audit } from 'src/modules/audit/audit.decorator';
import { AuditInterceptor } from 'src/modules/audit/audit.interceptor';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';
import { FileParseInterceptor } from 'src/common/interceptor/file-parse.interceptor';

@UseInterceptors(AuditInterceptor)
@Controller('cost-centers')
export class CostCentersController extends BaseController {
  constructor(private readonly costCentersService: CostCentersService) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['company.manage'])
  @Audit({
    action: 'Create',
    entity: 'Cost Center',
    getEntityId: (req) => req.params.id,
  })
  create(
    @Body() createCostCenterDto: CreateCostCenterDto,
    @CurrentUser() user: User,
  ) {
    return this.costCentersService.create(user.companyId, createCostCenterDto);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['company.manage'])
  @Audit({ action: 'BulkCreateCostCenters', entity: 'CostCenter' })
  @UseInterceptors(FileParseInterceptor({ field: 'file', maxRows: 200 }))
  async bulkCreate(@Body() rows: any[], @CurrentUser() user: User) {
    return this.costCentersService.bulkCreate(user.companyId, rows);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['company.manage'])
  findAll(@CurrentUser() user: User) {
    return this.costCentersService.findAll(user.companyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['company.manage'])
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.costCentersService.findOne(user.companyId, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['company.manage'])
  update(
    @Param('id') id: string,
    @Body() updateCostCenterDto: UpdateCostCenterDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.costCentersService.update(
      user.companyId,
      id,
      updateCostCenterDto,
      user.id,
      ip,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['company.manage'])
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.costCentersService.remove(user, id);
  }
}
